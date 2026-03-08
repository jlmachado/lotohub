'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { UploadCloud, X, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { formatBytes } from '@/lib/utils';
import type { ImageMetadata } from '@/context/AppContext';

export interface UploadedImageData {
    imageUrl: string;
    thumbUrl: string;
    metadata: ImageMetadata;
}

interface ImageUploaderProps {
  onUploadComplete: (data: UploadedImageData) => void;
  maxSizeKb: number;
  outputWidth: number;
  outputQuality: number;
  aspectRatio: number;
  currentImagePreview?: string | null;
}

export function ImageUploader({
  onUploadComplete,
  maxSizeKb,
  outputWidth,
  outputQuality,
  aspectRatio,
  currentImagePreview,
}: ImageUploaderProps) {
  const [preview, setPreview] = useState<string | null>(currentImagePreview || null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    
    if (!file.type.startsWith('image/')) {
        setError('Arquivo inválido. Por favor, selecione uma imagem (PNG, JPG, WebP).');
        return;
    }
    
    setError(null);
    setPreview(URL.createObjectURL(file));

    // Simulate compression and upload
    compressAndUpload(file);
  };

  const compressAndUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
        // Step 1: Simulate Client-side compression
        setUploadProgress(20);
        // In a real app, you would use a library or canvas to compress the image here.
        await new Promise(res => setTimeout(res, 500));
        
        const compressedSize = Math.min(file.size, maxSizeKb * 1024 * 0.8); // Simulate 80% of max size
        if (compressedSize > maxSizeKb * 1024) {
            throw new Error(`Imagem muito grande mesmo após compressão. Limite: ${maxSizeKb}KB`);
        }

        setUploadProgress(50);
        
        // Step 2: Simulate Upload to Firebase Storage
        for (let p = 50; p <= 100; p += 10) {
            await new Promise(res => setTimeout(res, 80));
            setUploadProgress(p);
        }

        // Step 3: Simulate getting download URLs
        const fakeUrl = URL.createObjectURL(file);
        const outputHeight = outputWidth / aspectRatio;
        
        const uploadedData: UploadedImageData = {
            imageUrl: fakeUrl,
            thumbUrl: fakeUrl,
            metadata: {
                width: outputWidth,
                height: outputHeight,
                sizeBytes: compressedSize,
                mimeType: 'image/webp',
            }
        };

        onUploadComplete(uploadedData);
        setPreview(fakeUrl);
        toast({ title: "Upload Concluído!", description: "A imagem foi processada com sucesso." });

    } catch (e: any) {
        setError(e.message || 'Ocorreu um erro durante o upload.');
        setPreview(null);
        toast({ variant: 'destructive', title: "Erro no Upload", description: e.message });
    } finally {
        setIsUploading(false);
        setUploadProgress(0);
    }
  };


  const onDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    handleFileSelect(e.dataTransfer.files);
  }, []);
  
  const onRemoveImage = () => {
    setPreview(null);
    setError(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
    onUploadComplete({ imageUrl: '', thumbUrl: '', metadata: { width: 0, height: 0, sizeBytes: 0, mimeType: '' } });
  }

  return (
    <div className="w-full space-y-2">
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleFileSelect(e.target.files)}
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
      />

      {preview ? (
        <div className="flex justify-center w-full">
          <div className="relative rounded-lg border p-1 bg-muted/10 h-[100px] md:h-[120px]" style={{ aspectRatio }}>
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-contain rounded-md"
            />
             <Button
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-lg"
              onClick={onRemoveImage}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center w-full border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors h-[100px] md:h-[120px]"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <UploadCloud className="h-6 w-6 text-muted-foreground mb-1" />
          <p className="font-semibold text-xs">Upload de Imagem</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            PNG, JPG, WebP (Max {maxSizeKb}KB)
          </p>
          {error && <p className="text-[10px] text-destructive mt-1">{error}</p>}
        </div>
      )}

      {isUploading && (
        <div className="space-y-1">
            <Progress value={uploadProgress} className="h-1" />
        </div>
      )}
    </div>
  );
}
