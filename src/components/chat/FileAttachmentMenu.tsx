import React, { useState, useRef } from 'react';
import { Plus, FileText, Camera, Image as ImageIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

interface FileAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

interface FileAttachmentMenuProps {
  onFilesChange: (files: FileAttachment[]) => void;
  attachedFiles: FileAttachment[];
  sessionId?: string;
}

export const FileAttachmentMenu: React.FC<FileAttachmentMenuProps> = ({
  onFilesChange,
  attachedFiles,
  sessionId
}) => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  const handleFileUpload = async (files: FileList | File[], allowedTypes: string[]) => {
    if (isUploading) return;

    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `File type ${file.type} is not supported`,
          variant: "destructive",
        });
        return false;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "File too large",
          description: `File ${file.name} is larger than 10MB`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setIsUploading(true);

    try {
      const uploadPromises = validFiles.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}-${Date.now()}.${fileExt}`;
        const folderPath = sessionId ? `chat-files/${sessionId}` : 'uploads';
        const filePath = `${folderPath}/${fileName}`;

        const { data, error } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(filePath);

        return {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          url: publicUrl,
          type: file.type,
          size: file.size,
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      const newFiles = [...attachedFiles, ...uploadedFiles];
      onFilesChange(newFiles);

      toast({
        title: "Files uploaded",
        description: `${uploadedFiles.length} file(s) uploaded successfully`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload files. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleImageSelect = () => {
    imageInputRef.current?.click();
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      setIsCameraOpen(true);
      
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (error) {
      console.error('Camera access error:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !stream) return;

    const canvas = document.createElement('canvas');
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    if (!context) return;
    
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
    if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ALLOWED_FILE_TYPES.join(',')}
        onChange={(e) => e.target.files && handleFileUpload(e.target.files, ALLOWED_FILE_TYPES)}
        className="hidden"
      />
      <input
        ref={imageInputRef}
        type="file"
        multiple
        accept={ALLOWED_IMAGE_TYPES.join(',')}
        onChange={(e) => e.target.files && handleFileUpload(e.target.files, ALLOWED_IMAGE_TYPES)}
        className="hidden"
      />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            className="relative bg-[#FF6600] hover:bg-[#E55A00] text-white h-10 w-10 p-0 rounded border-0"
            disabled={isUploading}
          >
            <Plus className="h-5 w-5" />
            {attachedFiles.length > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {attachedFiles.length}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={handleFileSelect} className="cursor-pointer">
            <FileText className="mr-2 h-4 w-4" />
            {t.attachFile}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleImageSelect} className="cursor-pointer">
            <ImageIcon className="mr-2 h-4 w-4" />
            {t.attachPhoto}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={startCamera} className="cursor-pointer">
            <Camera className="mr-2 h-4 w-4" />
            {t.takePhoto}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {attachedFiles.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {attachedFiles.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-2 text-sm"
            >
              {getFileIcon(file.type)}
              <span className="truncate max-w-32" title={file.name}>
                {file.name}
              </span>
              <span className="text-gray-500 text-xs">
                {formatFileSize(file.size)}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={() => removeFile(file.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Take Photo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={capturePhoto} className="bg-blue-600 hover:bg-blue-700">
                <Camera className="mr-2 h-4 w-4" />
                Capture
              </Button>
              <Button variant="outline" onClick={stopCamera}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};