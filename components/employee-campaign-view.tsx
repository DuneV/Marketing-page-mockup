"use client"

import type React from "react"

import { useState } from "react"
import { Upload, MessageSquare, ImageIcon, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface CampaignImage {
  id: string
  url: string
  name: string
  uploadedAt: string
  uploadedBy: string
}

interface CampaignComment {
  id: string
  author: string
  text: string
  timestamp: string
  role: string
}

export function EmployeeCampaignView() {
  const [comments, setComments] = useState<CampaignComment[]>([
    {
      id: "1",
      author: "Carlos García",
      text: "Las imágenes de la campaña se ven excelentes. El branding es muy consistente.",
      timestamp: "2024-01-15 10:30",
      role: "Coordinador de Marketing",
    },
    {
      id: "2",
      author: "María López",
      text: "Se completó el fotoshoot de los productos. Aquí están los primeros resultados.",
      timestamp: "2024-01-14 14:20",
      role: "Fotógrafa",
    },
  ])

  const [images, setImages] = useState<CampaignImage[]>([
    {
      id: "1",
      url: "/beer-campaign-photo-1.jpg",
      name: "product-showcase-1.jpg",
      uploadedAt: "2024-01-15",
      uploadedBy: "María López",
    },
    {
      id: "2",
      url: "/beer-campaign-photo-2.jpg",
      name: "product-showcase-2.jpg",
      uploadedAt: "2024-01-15",
      uploadedBy: "María López",
    },
    {
      id: "3",
      url: "/beer-campaign-photo-3.jpg",
      name: "event-coverage.jpg",
      uploadedAt: "2024-01-14",
      uploadedBy: "Juan Pérez",
    },
  ])

  const [newComment, setNewComment] = useState("")
  const [dragActive, setDragActive] = useState(false)

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment: CampaignComment = {
        id: Date.now().toString(),
        author: "Tú",
        text: newComment,
        timestamp: new Date().toLocaleString("es-ES"),
        role: "Empleado",
      }
      setComments([comment, ...comments])
      setNewComment("")
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = e.dataTransfer.files
    if (files && files[0]) {
      const file = files[0]
      const reader = new FileReader()
      reader.onload = (event) => {
        const image: CampaignImage = {
          id: Date.now().toString(),
          url: (event.target?.result as string) || "/abstract-geometric-shapes.png",
          name: file.name,
          uploadedAt: new Date().toLocaleDateString("es-ES"),
          uploadedBy: "Tú",
        }
        setImages([image, ...images])
      }
      reader.readAsDataURL(file)
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files[0]) {
      const file = files[0]
      const reader = new FileReader()
      reader.onload = (event) => {
        const image: CampaignImage = {
          id: Date.now().toString(),
          url: (event.target?.result as string) || "/abstract-geometric-shapes.png",
          name: file.name,
          uploadedAt: new Date().toLocaleDateString("es-ES"),
          uploadedBy: "Tú",
        }
        setImages([image, ...images])
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = (id: string) => {
    setImages(images.filter((img) => img.id !== id))
  }

  return (
    <div className="space-y-8">
      {/* Upload Section */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-amber-600" />
          Galería de Imágenes
        </h2>

        {/* Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragActive
              ? "border-amber-600 bg-amber-50 dark:bg-amber-900/20"
              : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 hover:border-amber-600"
          }`}
        >
          <input type="file" accept="image/*" onChange={handleFileInput} className="hidden" id="file-upload" />
          <label htmlFor="file-upload" className="cursor-pointer block">
            <Upload className="w-10 h-10 text-amber-600 mx-auto mb-2" />
            <p className="font-medium text-slate-900 dark:text-white">
              Arrastra imágenes aquí o haz clic para seleccionar
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Soportados: JPG, PNG, GIF (máx. 10MB)</p>
          </label>
        </div>

        {/* Image Gallery */}
        {images.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Imágenes subidas ({images.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="relative group rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-800 aspect-square"
                >
                  <img src={image.url || "/placeholder.svg"} alt={image.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-3">
                    <button
                      onClick={() => removeImage(image.id)}
                      className="bg-red-600 hover:bg-red-700 text-white p-2 rounded mb-2 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    <p className="text-white text-xs text-center break-words">{image.name}</p>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                    <p className="text-white text-xs font-medium truncate">{image.uploadedBy}</p>
                    <p className="text-gray-200 text-xs">{image.uploadedAt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-amber-600" />
          Comentarios de Campaña
        </h2>

        {/* New Comment Form */}
        <div className="mb-8 pb-8 border-b border-slate-200 dark:border-slate-700">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Comparte tus observaciones o actualizaciones sobre la campaña..."
            className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            rows={4}
          />
          <div className="mt-3 flex justify-end">
            <Button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Publicar Comentario
            </Button>
          </div>
        </div>

        {/* Comments List */}
        <div className="space-y-5">
          {comments.map((comment) => (
            <div key={comment.id} className="pb-5 border-b border-slate-200 dark:border-slate-700 last:border-0">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {comment.author.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                    <p className="font-semibold text-slate-900 dark:text-white">{comment.author}</p>
                    <p className="text-xs text-slate-600 dark:text-slate-400">{comment.role}</p>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{comment.timestamp}</p>
                  <p className="mt-2 text-slate-700 dark:text-slate-300 break-words">{comment.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
