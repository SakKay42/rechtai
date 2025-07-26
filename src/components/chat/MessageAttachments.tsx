import React from 'react';
import { Download, File, Image, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FileAttachment } from './FileUpload';

interface MessageAttachmentsProps {
  attachments: FileAttachment[];
}

export const MessageAttachments: React.FC<MessageAttachmentsProps> = ({ attachments }) => {
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

  const handleDownload = (file: FileAttachment) => {
    window.open(file.url, '_blank');
  };

  if (attachments.length === 0) return null;

  return (
    <div className="space-y-2 mt-2">
      {attachments.map((file) => (
        <Card key={file.id} className="p-3">
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
              variant="ghost"
              size="sm"
              onClick={() => handleDownload(file)}
              className="h-8 w-8 p-0"
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Show image preview for images */}
          {file.type.startsWith('image/') && (
            <div className="mt-2">
              <img 
                src={file.url} 
                alt={file.name}
                className="max-w-full h-auto max-h-48 rounded border object-cover"
              />
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};