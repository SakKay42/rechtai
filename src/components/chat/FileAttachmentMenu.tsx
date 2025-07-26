import React, { useRef, useState } from 'react';
import { Plus, File, Image, Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileAttachment } from './FileUpload';

interface FileAttachmentMenuProps {
  onFilesChange: (files: FileAttachment[]) => void;
  attachedFiles: FileAttachment[];
  sessionId?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];

export const FileAttachmentMenu: React.FC<FileAttachmentMenuProps> = ({
  onFilesChange,
  attachedFiles,
  sessionId = 'temp'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (files: File[], allowedTypes: string[]) => {
    if (files.length === 0) return;

    // Validate files
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "Файл слишком большой",
          description: `${file.name} превышает максимальный размер 10MB`,
          variant: "destructive",
        });
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Неподдерживаемый тип файла",
          description: `${file.name} имеет неподдерживаемый формат`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsUploading(true);
    
    try {
      const uploadedFiles: FileAttachment[] = [];

      for (const file of files) {
        const fileId = crypto.randomUUID();
        const fileName = `${fileId}_${file.name}`;
        const filePath = `${sessionId}/${fileName}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from('chat-files')
          .upload(filePath, file);

        if (error) {
          throw error;
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('chat-files')
          .getPublicUrl(filePath);

        // Read text content for text files
        let content: string | undefined;
        if (file.type === 'text/plain') {
          content = await file.text();
        }

        uploadedFiles.push({
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type,
          url: publicUrl,
          content
        });
      }

      onFilesChange([...attachedFiles, ...uploadedFiles]);
      
      toast({
        title: "Файлы загружены",
        description: `Успешно загружено ${uploadedFiles.length} файл(ов)`,
      });

    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Ошибка загрузки",
        description: "Не удалось загрузить файлы",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    handleFileUpload(files, ALLOWED_DOCUMENT_TYPES);
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    handleFileUpload(files, ALLOWED_IMAGE_TYPES);
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      setShowCamera(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error('Camera access error:', error);
      toast({
        title: "Ошибка доступа к камере",
        description: "Не удалось получить доступ к камере",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const file = new File([blob], `photo-${timestamp}.jpg`, { type: 'image/jpeg' });
      
      await handleFileUpload([file], ALLOWED_IMAGE_TYPES);
      stopCamera();
    }, 'image/jpeg', 0.8);
  };

  const removeFile = (fileId: string) => {
    const updatedFiles = attachedFiles.filter(file => file.id !== fileId);
    onFilesChange(updatedFiles);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-3 w-3" />;
    if (type === 'application/pdf') return <File className="h-3 w-3" />;
    return <File className="h-3 w-3" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex items-center gap-2">
      {/* File inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />

      {/* Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            className="relative h-8 w-8 p-0 rounded-full"
          >
            <Plus className="h-4 w-4" />
            {attachedFiles.length > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-[#FF6600] text-white text-xs rounded-full flex items-center justify-center">
                {attachedFiles.length}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="start" className="w-40">
          <DropdownMenuItem
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <File className="h-4 w-4 mr-2" />
            Файл
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={() => imageInputRef.current?.click()}
            disabled={isUploading}
          >
            <Image className="h-4 w-4 mr-2" />
            Фото
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={startCamera}
            disabled={isUploading}
          >
            <Camera className="h-4 w-4 mr-2" />
            Сделать фото
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Attached files preview - compact horizontal layout */}
      {attachedFiles.length > 0 && (
        <div className="flex items-center gap-1 max-w-[200px] overflow-x-auto">
          {attachedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-1 bg-muted rounded px-2 py-1 text-xs whitespace-nowrap"
            >
              {getFileIcon(file.type)}
              <span className="truncate max-w-[80px]">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeFile(file.id)}
                className="h-4 w-4 p-0 hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Camera Modal */}
      <Dialog open={showCamera} onOpenChange={(open) => !open && stopCamera()}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Сделать фото</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-64 object-cover"
              />
            </div>
            
            <div className="flex justify-center gap-4">
              <Button onClick={capturePhoto} disabled={isUploading}>
                <Camera className="h-4 w-4 mr-2" />
                Сделать снимок
              </Button>
              <Button variant="outline" onClick={stopCamera}>
                Отмена
              </Button>
            </div>
          </div>
          
          <canvas ref={canvasRef} className="hidden" />
        </DialogContent>
      </Dialog>
    </div>
  );
};