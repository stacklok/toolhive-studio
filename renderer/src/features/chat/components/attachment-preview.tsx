import { useState } from 'react'
import type { FileUIPart } from 'ai'
import { ImageModal } from './image-modal'

interface AttachmentPreviewProps {
  attachment: FileUIPart
  totalAttachments?: number
}

export function AttachmentPreview({
  attachment,
  totalAttachments = 1,
}: AttachmentPreviewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const isImage = attachment.mediaType?.startsWith('image/')
  const fileName = attachment.filename || 'Unknown file'
  const fileUrl = attachment.url

  // Scale size based on number of attachments
  const getImageSize = () => {
    if (totalAttachments === 1) return '80px'
    if (totalAttachments === 2) return '60px'
    if (totalAttachments <= 4) return '50px'
    return '40px'
  }

  const getContainerWidth = () => {
    if (totalAttachments === 1) return 'max-w-24'
    if (totalAttachments === 2) return 'max-w-20'
    if (totalAttachments <= 4) return 'max-w-16'
    return 'max-w-14'
  }

  return (
    <>
      <div className="">
        {isImage ? (
          <div
            className={`bg-card rounded-lg border p-2 ${getContainerWidth()}
              hover:bg-card/80 cursor-pointer transition-colors`}
            title={fileName}
          >
            <img
              src={fileUrl}
              alt={fileName}
              className="h-auto max-h-20 w-full rounded-md"
              style={{ maxWidth: getImageSize(), objectFit: 'contain' }}
              onClick={() => setIsModalOpen(true)}
            />
            <div
              className="text-muted-foreground mt-1 flex items-center
                justify-between text-xs"
            >
              <span className="max-w-16 truncate">{fileName}</span>
              {fileUrl && (
                <a
                  href={fileUrl}
                  download={fileName}
                  className="text-primary ml-2 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  ↓
                </a>
              )}
            </div>
          </div>
        ) : (
          <div
            className={`bg-muted/30 max-h-20 min-w-20 rounded-lg border p-2
              ${getContainerWidth()}`}
            title={fileName}
          >
            <div className="flex items-center gap-2">
              <div className="max-w-16 truncate text-sm font-medium">
                📎 {fileName}
              </div>
            </div>
            {fileUrl && (
              <a
                href={fileUrl}
                download={fileName}
                className="text-primary mt-1 flex text-sm hover:underline"
                title="Download"
              >
                <span className="w-auto truncate text-sm font-medium">
                  Download
                </span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {isImage && fileUrl && (
        <ImageModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          imageUrl={fileUrl}
          fileName={fileName}
        />
      )}
    </>
  )
}
