import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";

interface UploadQueueItem {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  url: string | null;
  previewUrl: string;
  error?: string;
}

export function useImageUpload() {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);

  const addFiles = useCallback((files: File[]) => {
    const newItems: UploadQueueItem[] = files.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const,
      url: null,
      previewUrl: URL.createObjectURL(file),
    }));

    setQueue(prev => [...prev, ...newItems]);
  }, []);

  const uploadAll = useCallback(async () => {
    const pendingItems = queue.filter(item => item.status === 'pending' || item.status === 'error');
    
    for (const item of pendingItems) {
      const index = queue.indexOf(item);
      
      setQueue(prev => prev.map((q, i) => 
        i === index ? { ...q, status: 'uploading' as const, progress: 0 } : q
      ));

      try {
        const formData = new FormData();
        formData.append('file', item.file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const result = await response.json();

        setQueue(prev => prev.map((q, i) => 
          i === index ? { 
            ...q, 
            status: 'complete' as const, 
            progress: 100, 
            url: result.url 
          } : q
        ));
      } catch (error: any) {
        setQueue(prev => prev.map((q, i) => 
          i === index ? { 
            ...q, 
            status: 'error' as const, 
            error: error.message 
          } : q
        ));
      }
    }
  }, [queue]);

  const removeItem = useCallback((index: number) => {
    setQueue(prev => {
      const item = prev[index];
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const clearAll = useCallback(() => {
    queue.forEach(item => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    setQueue([]);
  }, [queue]);

  const getUploadedUrls = useCallback(() => {
    return queue
      .filter(item => item.status === 'complete' && item.url)
      .map(item => item.url as string);
  }, [queue]);

  return {
    queue,
    addFiles,
    uploadAll,
    removeItem,
    clearAll,
    getUploadedUrls,
  };
}
