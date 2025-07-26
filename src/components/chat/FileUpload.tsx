import React, { useRef, useState } from 'react';
import { Upload, X, File, Image, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  content?: string;
}

interface FileUploadProps {
  onFilesChange: (files: FileAttachment[]) => void;
  attachedFiles: FileAttachment[];
  sessionId?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/jpg'
];

export const FileUpload: React.FC<FileUploadProps> = ({
  onFilesChange,
  attachedFiles,
  sessionId = 'temp'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
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

      if (!ALLOWED_TYPES.includes(file.type)) {
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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeFile = (fileId: string) => {
    const updatedFiles = attachedFiles.filter(file => file.id !== fileId);
    onFilesChange(updatedFiles);
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (type === 'application/pdf') return <FileText className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-2">
      {/* File input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Upload button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="w-full"
      >
        <Upload className="h-4 w-4 mr-2" />
        {isUploading ? 'Загрузка...' : 'Прикрепить файлы'}
      </Button>

      {/* Attached files preview */}
      {attachedFiles.length > 0 && (
        <div className="space-y-2">
          {attachedFiles.map((file) => (
            <Card key={file.id} className="p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  {getFileIcon(file.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file.id)}
                  className="h-8 w-8 p-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};