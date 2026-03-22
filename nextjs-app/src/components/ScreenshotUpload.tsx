import { useState, useRef } from 'react';
import { UploadCloud, X, Loader2, Image as ImageIcon, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface ScreenshotUploadProps {
  value: string;
  onChange: (url: string) => void;
  className?: string;
}

export function ScreenshotUpload({ value, onChange, className }: ScreenshotUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (PNG, JPG, etc).",
        variant: "destructive",
      });
      return;
    }

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

    setIsUploading(true);
    setProgress(10); // Start progress

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);

      setProgress(40);

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image to Cloudinary.");
      }

      setProgress(80);
      const data = await response.json();
      onChange(data.secure_url);
      setProgress(100);
      
    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTimeout(() => {
        setIsUploading(false);
        setProgress(0);
      }, 500); // small delay to let user see 100%
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files[0]);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files[0]);
    }
  };

  const isCloudinaryUrl = value?.includes('cloudinary.com');
  const isFirebaseUrl = value?.includes('firebasestorage.googleapis.com');
  const isImageUrl = isCloudinaryUrl || isFirebaseUrl;
  
  // If it's a known image host URL, hide the chaotic long string from the manual input box
  const displayValue = isImageUrl ? "" : value;

  return (
    <div className={cn("mt-1 space-y-3", className)}>
      {isImageUrl ? (
        <div className="relative group w-full h-[120px] rounded-xl overflow-hidden border border-border/50 bg-muted/30">
          <Image 
            src={value} 
            alt="Task Screenshot" 
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px] gap-3">
            <Button 
              type="button" 
              variant="secondary" 
              size="sm" 
              className="h-8 shadow-xl bg-white/90 hover:bg-white text-black"
              onClick={() => window.open(value, '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-1.5" /> View
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              size="sm" 
              className="h-8 shadow-xl"
              onClick={() => onChange("")}
            >
              <X className="w-4 h-4 mr-1.5" /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <label
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "relative flex flex-col items-center justify-center w-full h-[100px] rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden",
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30",
            isUploading ? "pointer-events-none" : ""
          )}
        >
          {isUploading ? (
            <div className="flex flex-col items-center p-4">
              <Loader2 className="w-8 h-8 text-primary animate-spin mb-2" />
              <div className="text-xs font-semibold text-foreground">Uploading... {progress}%</div>
              <div className="w-full h-1.5 bg-muted rounded-full mt-2 overflow-hidden max-w-[120px]">
                <div 
                  className="h-full bg-primary transition-all duration-300 ease-out" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-4 text-center">
              <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center mb-2 shadow-sm border border-border/50">
                <UploadCloud className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-xs font-medium text-foreground">
                <span className="text-primary font-bold">Click</span> or drag image here
              </p>
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={onFileChange}
            disabled={isUploading}
          />
        </label>
      )}

      {/* Manual Link Input */}
      <div className="flex items-center gap-2">
        <Input 
          value={displayValue}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Or paste a link manually..." 
          className="h-9 text-xs bg-background/50 border-muted-foreground/20 focus-visible:ring-primary/50"
          disabled={isUploading}
        />
      </div>
    </div>
  );
}
