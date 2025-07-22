import { useState } from 'react'
import { toast } from 'sonner'
import log from 'electron-log/renderer'

interface UseDownloadFileReturn {
  isDownloading: boolean
  downloadFile: (
    getContent: () => Promise<string>,
    filename: string
  ) => Promise<void>
}

export function useDownloadFile(): UseDownloadFileReturn {
  const [isDownloading, setIsDownloading] = useState(false)

  const downloadFile = async (
    getContent: () => Promise<string>,
    filename: string
  ): Promise<void> => {
    setIsDownloading(true)
    try {
      const content = await getContent()
      if (!content) {
        throw new Error('Failed to get file content')
      }
      const blob = new Blob([content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error('Failed to save file')
      log.error('Failed to save file:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  return {
    isDownloading,
    downloadFile,
  }
}
