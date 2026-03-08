'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Popup } from '@/context/AppContext';

interface PopupDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  popup: Popup | null;
}

export function PopupDialog({ isOpen, onOpenChange, popup }: PopupDialogProps) {
  const router = useRouter();

  if (!popup) {
    return null;
  }

  const handleButtonClick = () => {
    if (popup.linkUrl) {
      router.push(popup.linkUrl);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden top-[10%] translate-y-0 h-[50vh] max-h-[50vh] flex flex-col">
        {popup.imageUrl && (
          <div className="relative w-full aspect-video shrink-0">
            <Image src={popup.imageUrl} alt={popup.title} layout="fill" objectFit="cover" />
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-6 text-center space-y-4">
          <DialogHeader>
            <DialogTitle className="text-2xl">{popup.title}</DialogTitle>
            {popup.description && (
              <DialogDescription>{popup.description}</DialogDescription>
            )}
          </DialogHeader>
        </div>
        {(popup.buttonText || !popup.linkUrl) && (
            <DialogFooter className="p-6 pt-0 shrink-0">
                <Button className="w-full" onClick={handleButtonClick}>
                    {popup.buttonText || 'Fechar'}
                </Button>
            </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
