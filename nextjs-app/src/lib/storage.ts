import { 
  type Task, type InsertTask, type Member, type InsertMember,
  type BoardFolder, type InsertBoardFolder
} from "@/shared/schema";
import { collection, getDocs, addDoc, updateDoc, doc, Timestamp, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";


export interface IStorage {
  getTasks(companyName?: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  createTasks(tasks: InsertTask[]): Promise<Task[]>;
  updateTask(id: any, updates: Partial<Task>): Promise<Task>;
  deleteTask(id: any): Promise<void>;
  deleteCompanyTasks(companyName: string): Promise<void>;
  restoreCompanyTasks(companyName: string): Promise<void>;
  permanentlyDeleteCompanyTasks(companyName: string): Promise<void>;
  getMembers(companyName?: string): Promise<Member[]>;
  createMember(member: InsertMember): Promise<Member>;
  deleteMember(id: string): Promise<void>;
  getBoardFolders(companyName?: string): Promise<BoardFolder[]>;
  createBoardFolder(folder: InsertBoardFolder): Promise<BoardFolder>;
}

export class FirebaseStorage implements IStorage {
  private collectionName: string;

  constructor(collectionName: string = "tasks") {
    this.collectionName = collectionName;
  }

  private get collectionRef() {
    return collection(db, this.collectionName);
  }

  // Helper to generate a stable but unguessable slug for a company
  getCompanySlug(name: string): string {
    // A simple deterministic transformation that's not obvious
    // In a real app we'd use a crypto hash or store this in DB
    const secret = "rohan-secret-2024";
    const buffer = Buffer.from(secret + name);
    // Use a simple hash-like slice or a real hash
    return buffer.toString("hex").substring(10, 22).toLowerCase();
  }

  async getTasks(identifier?: string, includeDeleted: boolean = false): Promise<Task[]> {
    try {
      const q = query(this.collectionRef, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      
      let tasks = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id as any,
          createdAt: data.createdAt?.toDate() || null,
          completedAt: data.completedAt?.toDate() || null,
        } as Task;
      });

      // Filter based on includeDeleted flag
      // If includeDeleted is true, ONLY show soft-deleted tasks (for the Trash view)
      // If includeDeleted is false, ONLY show active tasks
      tasks = tasks.filter(t => {
        const isDeleted = !!t.deletedAt;
        return includeDeleted ? isDeleted : !isDeleted;
      });

      // Cleanup logic: If we encounter deleted tasks older than 15 days when querying the trash
      if (includeDeleted) {
        const now = new Date();
        const expirationDays = 15;
        
        tasks = tasks.filter(t => {
          if (!t.deletedAt) return false;
          
          const deletedDate = new Date(t.deletedAt);
          const differenceInTime = now.getTime() - deletedDate.getTime();
          const differenceInDays = differenceInTime / (1000 * 3600 * 24);
          
          if (differenceInDays > expirationDays) {
            // Delete permanently in the background
            this.deleteTask(t.id).catch(err => console.error("Auto cleanup failed for task", t.id, err));
            return false; // Don't return it
          }
          return true;
        });
      }

      if (identifier) {
        const target = decodeURIComponent(identifier).trim().toLowerCase();
        
        // Check if identifier is a Name or a Slug
        return tasks.filter(t => {
          const name = t.companyName.trim().toLowerCase();
          const slug = this.getCompanySlug(t.companyName).toLowerCase();
          return name === target || slug === target;
        });
      }

      return tasks;
    } catch (e) {
      console.error("Firebase getTasks error:", e);
      throw e;
    }
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const taskData = {
      ...insertTask,
      dateOfJoin: insertTask.dateOfJoin || "",
      createdAt: Timestamp.now(),
      completedAt: null,
    };
    const docRef = await addDoc(this.collectionRef, taskData);
    const createdData = { ...taskData, id: docRef.id as any, createdAt: taskData.createdAt.toDate() };
    return createdData as Task;
  }

  async createTasks(insertTasks: InsertTask[]): Promise<Task[]> {
    const results: Task[] = [];
    for (const task of insertTasks) {
      results.push(await this.createTask(task));
    }
    return results;
  }

  async updateTask(id: any, updates: Partial<Task>): Promise<Task> {
    const docRef = doc(db, "tasks", String(id));
    const firestoreUpdates: any = { ...updates };
    
    if (updates.status === "completed") {
      firestoreUpdates.completedAt = Timestamp.now();
      
      // If we're marking as completed, check if it's a different day from original work date
      // We need to fetch the current task data to compare taskDate
      try {
        const { getDoc } = await import("firebase/firestore");
        const currentDoc = await getDoc(docRef);
        const currentData = currentDoc.data();
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        if (currentData && currentData.taskDate && currentData.taskDate !== today) {
          firestoreUpdates.originalDate = currentData.taskDate;
          firestoreUpdates.taskDate = today;
        }
      } catch (e) {
        console.error("Error updating taskDate on completion:", e);
      }
    } else if (updates.status === "in_progress") {
      firestoreUpdates.completedAt = null;
    }
    
    await updateDoc(docRef, firestoreUpdates);
    return { id, ...updates } as any;
  }

  async deleteTask(id: any): Promise<void> {
    const { deleteDoc } = await import("firebase/firestore");
    const docRef = doc(db, "tasks", String(id));
    await deleteDoc(docRef);
  }

  async deleteCompanyTasks(companyName: string): Promise<void> {
    const { getDocs, query, where, updateDoc } = await import("firebase/firestore");
    const q = query(this.collectionRef, where("companyName", "==", companyName));
    const querySnapshot = await getDocs(q);
    
    // Soft delete: set deletedAt property instead of deleting document completely
    const deletePromises = querySnapshot.docs.map(document => 
      updateDoc(doc(db, "tasks", document.id), { deletedAt: Timestamp.now() })
    );
    
    await Promise.all(deletePromises);
  }

  async restoreCompanyTasks(companyName: string): Promise<void> {
    const { getDocs, query, where, updateDoc } = await import("firebase/firestore");
    const q = query(this.collectionRef, where("companyName", "==", companyName));
    const querySnapshot = await getDocs(q);
    
    const restorePromises = querySnapshot.docs.map(document => 
      updateDoc(doc(db, "tasks", document.id), { deletedAt: null })
    );
    
    await Promise.all(restorePromises);
  }

  async permanentlyDeleteCompanyTasks(companyName: string): Promise<void> {
    const { getDocs, query, where, deleteDoc } = await import("firebase/firestore");
    const q = query(this.collectionRef, where("companyName", "==", companyName));
    const querySnapshot = await getDocs(q);
    
    const deletePromises = querySnapshot.docs.map(document => 
      deleteDoc(doc(db, "tasks", document.id))
    );
    
    await Promise.all(deletePromises);
  }

  // --- Member Methods ---
  async getMembers(companyName?: string): Promise<Member[]> {
    try {
      const memberCol = collection(db, "team_members");
      const q = query(memberCol, orderBy("name", "asc"));
      const snapshot = await getDocs(q);
      
      let members = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate() || null,
      } as Member));

      if (companyName) {
        members = members.filter(m => m.companyName === companyName);
      }
      return members;
    } catch (e) {
      console.error("Error fetching members:", e);
      return [];
    }
  }

  async createMember(insertMember: InsertMember): Promise<Member> {
    const memberCol = collection(db, "team_members");
    const data = {
      ...insertMember,
      createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(memberCol, data);
    return { ...data, id: docRef.id, createdAt: data.createdAt.toDate() } as Member;
  }

  async deleteMember(id: string): Promise<void> {
    const { deleteDoc } = await import("firebase/firestore");
    const docRef = doc(db, "team_members", id);
    await deleteDoc(docRef);
  }

  // --- Board Folder Methods ---
  async getBoardFolders(companyName?: string): Promise<BoardFolder[]> {
    try {
      const folderCol = collection(db, "board_folders");
      const q = query(folderCol, orderBy("createdAt", "asc"));
      const snapshot = await getDocs(q);
      
      let folders = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        createdAt: doc.data().createdAt?.toDate() || null,
      } as BoardFolder));

      if (companyName) {
        folders = folders.filter(f => f.companyName === companyName);
      }
      return folders;
    } catch (e) {
      console.error("Error fetching board folders:", e);
      return [];
    }
  }

  async createBoardFolder(insertFolder: InsertBoardFolder): Promise<BoardFolder> {
    const folderCol = collection(db, "board_folders");
    const data = {
      ...insertFolder,
      createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(folderCol, data);
    return { ...data, id: docRef.id, createdAt: data.createdAt.toDate() } as BoardFolder;
  }

  async deleteBoardFolder(id: string): Promise<void> {
    const { deleteDoc, doc } = await import("firebase/firestore");
    const docRef = doc(db, "board_folders", id);
    await deleteDoc(docRef);
  }
}

export const storage = new FirebaseStorage("tasks");
export const teamStorage = new FirebaseStorage("team_tasks");
