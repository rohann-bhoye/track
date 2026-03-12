import { type Task, type InsertTask } from "@/shared/schema";
import { collection, getDocs, addDoc, updateDoc, doc, Timestamp, query, orderBy } from "firebase/firestore";
import { db } from "./firebase";


export interface IStorage {
  getTasks(): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  createTasks(tasks: InsertTask[]): Promise<Task[]>;
  updateTask(id: any, updates: Partial<Task>): Promise<Task>;
  deleteTask(id: any): Promise<void>;
}

export class FirebaseStorage implements IStorage {
  private collectionRef = collection(db, "tasks");

  async getTasks(): Promise<Task[]> {
    const q = query(this.collectionRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id as any,
        createdAt: data.createdAt?.toDate() || null,
        completedAt: data.completedAt?.toDate() || null,
      } as Task;
    });
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const taskData = {
      ...insertTask,
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
}

export const storage = new FirebaseStorage();
