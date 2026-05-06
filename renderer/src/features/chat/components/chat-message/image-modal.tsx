import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/common/components/ui/dialog'
import { X } from 'lucide-react'
import { Button } from '@/common/components/ui/button'

interface ImageModalProps {
  isOpen: boolean
  onClose: () => void
  imageUrl: string
  fileName: string
}

export function ImageModal({
  isOpen,
  onClose,
  imageUrl,
  fileName,
}: ImageModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        aria-describedby="image-modal-description"
        className="max-h-[90vh] max-w-4xl p-2"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">{fileName}</DialogTitle>
        <DialogDescription aria-describedby={`ImageModal for ${fileName}`} />
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 z-10 bg-black/50 text-white
              hover:bg-black/70"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
          <img
            src={imageUrl}
            alt={fileName}
            className="h-auto max-h-[95vh] w-full rounded-lg object-contain"
          />
          <div className="mt-2 text-center">
            <p className="text-muted-foreground text-sm">{fileName}</p>
            <a
              href={imageUrl}
              download={fileName}
              className="text-primary text-sm hover:underline"
            >
              Download original
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
