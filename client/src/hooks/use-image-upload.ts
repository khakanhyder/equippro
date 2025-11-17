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
  abortController?: AbortController;
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
    
    console.log('[useImageUpload] uploadAll called, pending items:', pendingItems.length);
    
    if (pendingItems.length === 0) {
      console.log('[useImageUpload] No pending items, returning empty array');
      return [];
    }
    
    const uploadedUrls: string[] = [];
    
    for (let i = 0; i < pendingItems.length; i++) {
      const item = pendingItems[i];
      console.log(`[useImageUpload] Processing item ${i + 1}/${pendingItems.length}:`, item.file.name);
      const itemId = item.id;
      const abortController = new AbortController();
      
      // Get fresh queue state synchronously
      let currentQueueState: UploadQueueItem[] = [];
      setQueue(prev => {
        currentQueueState = prev;
        return prev;
      });
      
      const itemIndex = currentQueueState.findIndex(q => q.id === itemId);
      console.log('[useImageUpload] Current queue has', currentQueueState.length, 'items, item found at index:', itemIndex);
      
      if (itemIndex === -1) {
        console.log('[useImageUpload] Item no longer in queue, skipping:', item.file.name);
        continue;
      }
      
      // Mark as uploading
      setQueue(prev => prev.map((q, i) => 
        i === itemIndex ? { ...q, status: 'uploading' as const, progress: 0, abortController } : q
      ));

      console.log('[useImageUpload] Starting fetch for:', item.file.name);
      try {
        const formData = new FormData();
        formData.append('file', item.file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const result = await response.json();
        console.log('[useImageUpload] Upload successful for:', item.file.name, 'URL:', result.url);
        
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
        console.log('[useImageUpload] Upload error for:', item.file.name, 'Error:', error.message, 'Type:', error.name);
        if (error.name === 'AbortError') {
          console.log('[useImageUpload] Upload aborted, continuing to next item');
          continue;
        }
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
    
    console.log('[useImageUpload] uploadAll complete, uploaded URLs:', uploadedUrls.length);
    return uploadedUrls;
  }, []);

  const removeItem = useCallback((index: number) => {
    setQueue(prev => {
      const item = prev[index];
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      if (item?.abortController) {
        item.abortController.abort();
      }
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const clearAll = useCallback(() => {
    queue.forEach(item => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      if (item.abortController) {
        item.abortController.abort();
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
