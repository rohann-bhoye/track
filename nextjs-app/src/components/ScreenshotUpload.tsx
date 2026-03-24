import { useState, useRef, useEffect } from 'react';
import { UploadCloud, X, Loader2, Image as ImageIcon, ExternalLink, FolderPlus, Trash, ChevronRight, ChevronDown, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { screenshotGroupSchema } from '@/shared/schema';
import { z } from 'zod';

type ScreenshotGroup = z.infer<typeof screenshotGroupSchema>;

interface ScreenshotUploadProps {
  value: ScreenshotGroup[];
  onChange: (groups: ScreenshotGroup[]) => void;
  className?: string;
}

export function ScreenshotUpload({ value = [], onChange, className }: ScreenshotUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, number>>({});
  const [selectedFolderIdx, setSelectedFolderIdx] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // If no folders exist, create a default one
  useEffect(() => {
    if (value.length === 0) {
      onChange([{ folderName: "Screenshots", urls: [] }]);
    }
  }, [value, onChange]);

  const addFolder = () => {
    const newFolder: ScreenshotGroup = { 
      folderName: `New Folder ${value.length + 1}`, 
      urls: [] 
    };
    onChange([...value, newFolder]);
    setSelectedFolderIdx(value.length);
  };

  const removeFolder = (idx: number) => {
    const next = [...value];
    next.splice(idx, 1);
    onChange(next);
    if (selectedFolderIdx >= next.length) {
      setSelectedFolderIdx(Math.max(0, next.length - 1));
    }
  };

  const renameFolder = (idx: number, newName: string) => {
    const next = [...value];
    next[idx] = { ...next[idx], folderName: newName };
    onChange(next);
  };

  const handleUpload = async (files: FileList | File[], folderIdx: number) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      toast({
        title: "Cloudinary Not Configured",
        description: "Missing Cloudinary environment variables.",
        variant: "destructive",
      });
      return;
    }

    const nextGroups = [...value];
    const targetFolder = { ...nextGroups[folderIdx] };
    const fileArray = Array.from(files);

    for (const file of fileArray) {
      if (!file.type.startsWith('image/')) continue;

      const fileId = Math.random().toString(36).substring(7);
      setUploadingFiles(prev => ({ ...prev, [fileId]: 10 }));

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", uploadPreset);

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) throw new Error("Failed to upload image.");

        const data = await response.json();
        targetFolder.urls.push(data.secure_url);
        nextGroups[folderIdx] = targetFolder;
        onChange([...nextGroups]);

      } catch (error: any) {
        toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
      } finally {
        setTimeout(() => {
          setUploadingFiles(prev => {
            const next = { ...prev };
            delete next[fileId];
            return next;
          });
        }, 500);
      }
    }
  };

  const removeImage = (folderIdx: number, imgIdx: number) => {
    const next = [...value];
    const folder = { ...next[folderIdx] };
    folder.urls.splice(imgIdx, 1);
    next[folderIdx] = folder;
    onChange(next);
  };

  const isUploading = Object.keys(uploadingFiles).length > 0;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <FolderOpen className="w-3.5 h-3.5 text-primary" /> Screenshot Folders
        </label>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          className="h-7 text-[10px] bg-background/50 border-primary/20 hover:bg-primary/5 text-primary"
          onClick={addFolder}
        >
          <FolderPlus className="w-3.5 h-3.5 mr-1" /> New Folder
        </Button>
      </div>

      <div className="space-y-3">
        {value.map((group, gIdx) => (
          <div key={gIdx} className={cn(
            "rounded-xl border transition-all overflow-hidden",
            selectedFolderIdx === gIdx ? "border-primary/30 bg-primary/5" : "border-border/60 bg-muted/20"
          )}>
            {/* Folder Header */}
            <div 
              className="px-3 py-2 flex items-center gap-2 cursor-pointer group hover:bg-primary/5"
              onClick={() => setSelectedFolderIdx(gIdx)}
            >
              <div className="text-primary opacity-60 group-hover:opacity-100 transition-opacity">
                {selectedFolderIdx === gIdx ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </div>
              <Input 
                value={group.folderName}
                onChange={(e) => renameFolder(gIdx, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="h-7 px-2 text-xs font-bold bg-transparent border-none focus-visible:ring-0 w-full"
                placeholder="Folder Name..."
              />
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-destructive hover:bg-destructive/10"
                  onClick={(e) => { e.stopPropagation(); removeFolder(gIdx); }}
                >
                  <Trash className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Folder Content */}
            {selectedFolderIdx === gIdx && (
              <div className="p-3 pt-0 space-y-3">
                {/* Images Grid */}
                {group.urls.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                    {group.urls.map((url, iIdx) => (
                      <div key={iIdx} className="relative group aspect-video rounded-lg overflow-hidden border border-border/50 bg-background/50">
                        <Image src={url} alt="Proof" fill className="object-cover" sizes="200px" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                          <Button size="icon" variant="ghost" className="h-6 w-6 bg-white/90" onClick={() => window.open(url, '_blank')}><ExternalLink className="w-3 h-3 text-black" /></Button>
                          <Button size="icon" variant="destructive" className="h-6 w-6" onClick={() => removeImage(gIdx, iIdx)}><X className="w-3 h-3" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Area for this folder */}
                <label className={cn(
                  "relative flex flex-col items-center justify-center w-full min-h-[60px] rounded-lg border-2 border-dashed transition-all cursor-pointer",
                  "border-muted-foreground/20 hover:border-primary/50 hover:bg-background/50"
                )}>
                  <div className="flex flex-col items-center justify-center p-3 text-center">
                    {isUploading && selectedFolderIdx === gIdx ? (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    ) : (
                      <p className="text-[10px] font-medium text-muted-foreground">
                        <span className="text-primary font-bold">Add to {group.folderName}</span>
                      </p>
                    )}
                  </div>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && handleUpload(e.target.files, gIdx)} />
                </label>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
