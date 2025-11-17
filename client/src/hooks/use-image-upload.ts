import { useState, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";

interface UploadQueueItem {
  id: string;
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
      id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status: 'pending' as const,
      url: null,
      previewUrl: URL.createObjectURL(file),
    }));

    setQueue(prev => [...prev, ...newItems]);
  }, []);

  const uploadAll = useCallback(async (): Promise<string[]> => {
    let currentQueue: UploadQueueItem[] = [];
    setQueue(prev => {
      currentQueue = prev;
      return prev;
    });
    
    const pendingItems = currentQueue
      .filter(item => item.status === 'pending' || item.status === 'error');
    
    if (pendingItems.length === 0) {
      return [];
    }
    
    const uploadedUrls: string[] = [];
    
    for (const item of pendingItems) {
      const itemId = item.id;
      
      let shouldUpload = false;
      setQueue(prev => {
        const idx = prev.findIndex(q => q.id === itemId);
        if (idx === -1) {
          shouldUpload = false;
          return prev;
        }
        shouldUpload = true;
        return prev.map((q, i) => 
          i === idx ? { ...q, status: 'uploading' as const, progress: 0 } : q
        );
      });
      
      if (!shouldUpload) {
        continue;
      }

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
        
        let itemStillExists = false;
        setQueue(prev => {
          const idx = prev.findIndex(q => q.id === itemId);
          if (idx === -1) {
            itemStillExists = false;
            return prev;
          }
          itemStillExists = true;
          return prev.map((q, i) => 
            i === idx ? { 
              ...q, 
              status: 'complete' as const, 
              progress: 100, 
              url: result.url 
            } : q
          );
        });
        
        if (itemStillExists) {
          uploadedUrls.push(result.url);
        }
      } catch (error: any) {
        setQueue(prev => {
          const idx = prev.findIndex(q => q.id === itemId);
          if (idx === -1) return prev;
          return prev.map((q, i) => 
            i === idx ? { 
              ...q, 
              status: 'error' as const, 
              error: error.message 
            } : q
          );
        });
      }
    }
    
    return uploadedUrls;
  }, []);

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
