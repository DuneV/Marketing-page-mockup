import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Campaign } from "@/types/campaign"

interface DeleteCampaignDialogProps {
  campaign: Campaign | null
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

export function DeleteCampaignDialog({ campaign, isOpen, onClose, onConfirm }: DeleteCampaignDialogProps) {
  if (!campaign) return null

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
          <AlertDialogDescription asChild className="space-y-2">
            <div>
              <p>
                Estás a punto de eliminar la campaña <strong>{campaign.nombre}</strong>.
              </p>
              <p className="text-red-600 dark:text-red-400 font-medium">
                Esta acción eliminará permanentemente:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>La campaña y toda su información</li>
                <li>Todas las imágenes subidas</li>
                <li>Todos los comentarios</li>
              </ul>
              {campaign.usuarioResponsableNombre && (
                <p className="text-sm">
                  El usuario <strong>{campaign.usuarioResponsableNombre}</strong> será desasignado de esta campaña.
                </p>
              )}
              <p className="font-semibold text-slate-900 dark:text-slate-100 mt-4">
                Esta acción no se puede deshacer.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            Eliminar Campaña
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
