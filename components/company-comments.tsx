"use client"

import { MessageCircle } from "lucide-react"

interface Comment {
  id: string
  author: string
  role: string
  content: string
  date: string
  avatar: string
}

const comments: Comment[] = [
  {
    id: "1",
    author: "María López",
    role: "Directora de Marketing",
    content: "Excelente desempeño en la campaña de verano. Los resultados superan nuestras expectativas en engagement.",
    date: "2025-02-15",
    avatar: "ML",
  },
  {
    id: "2",
    author: "Carlos Rodríguez",
    role: "CEO",
    content: "El ROI de 245% confirma que nuestra estrategia de diversificación de canales fue acertada.",
    date: "2025-02-10",
    avatar: "CR",
  },
  {
    id: "3",
    author: "Ana García",
    role: "Especialista en Análisis",
    content: "Recomendamos aumentar inversión en el canal digital en próximas campañas basado en estos datos.",
    date: "2025-02-08",
    avatar: "AG",
  },
]

export function CompanyComments() {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center gap-2 mb-6">
        <MessageCircle className="w-5 h-5 text-amber-600" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-50">Comentarios de la Empresa</h3>
      </div>

      <div className="space-y-4">
        {comments.map((comment) => (
          <div key={comment.id} className="pb-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">{comment.avatar}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-baseline justify-between">
                  <p className="font-medium text-slate-900 dark:text-slate-50">{comment.author}</p>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {new Date(comment.date).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">{comment.role}</p>
                <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">{comment.content}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
