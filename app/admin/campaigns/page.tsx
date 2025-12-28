"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { ImportWizard } from "@/components/admin/imports/ImportWizard"


export default function AdminCampaignsPage() {
  return (
    <AdminLayout>
      <ImportWizard importType="campaigns" />
    </AdminLayout>
  )
}

