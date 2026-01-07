"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
    LayoutDashboard,
    Plus,
    Trash2,
    AlertCircle,
    GripVertical,
    Save,
    Palette,
    Download,
    FileText,
} from "lucide-react";
import { reportConfigStorage } from "@/lib/report-config-storage";
import {
    DATA_SOURCE_LABELS,
    CHART_TYPE_LABELS,
    KPI_OPERATION_LABELS
} from "@/lib/report-config-labels";
import type { Campaign } from "@/types/campaign";
import type {
    ReportConfiguration,
    DashboardRow,
    ChartDefinition,
    KPIDefinition,
    ChartType,
    DataSource,
    KPIOperation,
    ReportTemplate,
    BootstrapCol,
} from "@/types/report-config";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ReportConfigBuilderCampaignProps {
    campaign: Campaign;
    onSaved?: () => void;
}

// Configuración por defecto sin límites
const DEFAULT_LIMITS = {
    maxKPIs: 20,
    maxFilas: 10,
    maxGraficosPorFila: 4,
};

// Todas las fuentes de datos disponibles
const ALL_DATA_SOURCES: DataSource[] = [
    "ventas_clubcolombia",
    "ventas_aguila",
    "ventas_poker",
    "ventas_ponymalta",
    "engagement_social",
    "impresiones_totales",
    "roi_campana",
    "costo_adquisicion",
    "tasa_conversion",
    "alcance_total",
];

// Todos los tipos de gráficos disponibles
const ALL_CHART_TYPES: ChartType[] = [
    "torta",
    "barras",
    "spline",
    "plot",
    "scatter",
    "area",
    "radar",
    "funnel",
    "gauge",
    "heatmap",
    "treemap",
    "tabla",
];

export function ReportConfigBuilderCampaign({ campaign, onSaved }: ReportConfigBuilderCampaignProps) {
    const [open, setOpen] = useState(false);
    const [config, setConfig] = useState<Omit<ReportConfiguration, "id" | "fechaCreacion" | "fechaActualizacion"> | null>(null);
    const [templates, setTemplates] = useState<ReportTemplate[]>([]);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (open) {
            try {
                reportConfigStorage.initialize();
                const allTemplates = reportConfigStorage.getAllTemplates();
                setTemplates(allTemplates);
                const existingConfig = reportConfigStorage.getCampaignReportConfig(campaign.id);
                if (existingConfig) {
                    setConfig(existingConfig);
                } else {
                    setConfig({
                        campaignId: campaign.id,
                        campaignNombre: campaign.nombre,
                        empresaId: campaign.empresaId,
                        empresaNombre: campaign.empresaNombre,
                        filtros: {
                            campanas: [campaign.id],
                            fechas: {
                                inicio: campaign.fechaInicio,
                                fin: campaign.fechaFin,
                            }
                        },
                        paletaColores: {
                            primario: "#000000",
                            secundario: "#ffffff",
                            acento: "#FFB000",
                        },
                        kpis: [],
                        filas: [],
                        activa: true,
                    });
                }
            } catch (error) {
                console.error("Error loading config:", error);
            }
        }
    }, [open, campaign.id, campaign.nombre, campaign.empresaId, campaign.empresaNombre, campaign.fechaInicio, campaign.fechaFin]);

    const loadTemplate = (templateId: string) => {
        const template = templates.find((t) => t.id === templateId);
        if (template) {
            // Preserve predefined filters when loading template, or merge them?
            // Templates usually have empty filters. Let's keep campaign-specific filters.
            setConfig(prev => prev ? ({
                ...prev,
                ...template.configuracion,
                // Override template filters with campaign specific ones if needed, 
                // usually templates just define structure (kpis, rows).
                // But if template has filters, they might overwrite. 
                // Let's restore our campaign context fields to be safe.
                campaignId: campaign.id,
                campaignNombre: campaign.nombre,
                empresaId: campaign.empresaId,
                empresaNombre: campaign.empresaNombre,
                filtros: {
                    ...template.configuracion.filtros,
                    campanas: [campaign.id], // Enforce current campaign
                    fechas: {
                        inicio: campaign.fechaInicio,
                        fin: campaign.fechaFin,
                    }
                }
            }) : null);
        }
    };

    const addKPI = () => {
        if (!config) return;
        if (config.kpis.length >= DEFAULT_LIMITS.maxKPIs) {
            alert(`Límite de KPIs alcanzado (${DEFAULT_LIMITS.maxKPIs})`);
            return;
        }
        const newKPI: KPIDefinition = {
            id: crypto.randomUUID(),
            nombre: "Nuevo KPI",
            operacion: "mean",
            fuente: ALL_DATA_SOURCES[0],
        };
        setConfig({ ...config, kpis: [...config.kpis, newKPI] });
    };

    const updateKPI = (id: string, updates: Partial<KPIDefinition>) => {
        if (!config) return;
        setConfig({
            ...config,
            kpis: config.kpis.map((kpi) => (kpi.id === id ? { ...kpi, ...updates } : kpi)),
        });
    };

    const deleteKPI = (id: string) => {
        if (!config) return;
        setConfig({
            ...config,
            kpis: config.kpis.filter((kpi) => kpi.id !== id),
        });
    };

    const addRow = () => {
        if (!config) return;
        if (config.filas.length >= DEFAULT_LIMITS.maxFilas) {
            alert(`Límite de filas alcanzado (${DEFAULT_LIMITS.maxFilas})`);
            return;
        }
        const newRow: DashboardRow = {
            id: crypto.randomUUID(),
            orden: config.filas.length + 1,
            graficos: [],
        };
        setConfig({ ...config, filas: [...config.filas, newRow] });
    };

    const deleteRow = (id: string) => {
        if (!config) return;
        const filtered = config.filas.filter((row) => row.id !== id);
        const reordered = filtered.map((row, index) => ({ ...row, orden: index + 1 }));
        setConfig({ ...config, filas: reordered });
    };

    const addChartToRow = (rowId: string) => {
        if (!config) return;
        const row = config.filas.find((r) => r.id === rowId);
        if (!row) return;
        if (row.graficos.length >= DEFAULT_LIMITS.maxGraficosPorFila) {
            alert(`Límite de gráficos por fila alcanzado (${DEFAULT_LIMITS.maxGraficosPorFila})`);
            return;
        }
        const newChart: ChartDefinition = {
            id: crypto.randomUUID(),
            tipo: ALL_CHART_TYPES[0],
            titulo: "Nuevo Gráfico",
            fuente: ALL_DATA_SOURCES[0],
            columnas: 6 as BootstrapCol,
        };
        setConfig({
            ...config,
            filas: config.filas.map((r) =>
                r.id === rowId ? { ...r, graficos: [...r.graficos, newChart] } : r
            ),
        });
    };

    const updateChart = (rowId: string, chartId: string, updates: Partial<ChartDefinition>) => {
        if (!config) return;
        setConfig({
            ...config,
            filas: config.filas.map((row) =>
                row.id === rowId
                    ? {
                        ...row,
                        graficos: row.graficos.map((chart) =>
                            chart.id === chartId ? { ...chart, ...updates } : chart
                        ),
                    }
                    : row
            ),
        });
    };

    const deleteChart = (rowId: string, chartId: string) => {
        if (!config) return;
        setConfig({
            ...config,
            filas: config.filas.map((row) =>
                row.id === rowId
                    ? { ...row, graficos: row.graficos.filter((c) => c.id !== chartId) }
                    : row
            ),
        });
    };

    const handleSave = () => {
        if (!config) return;
        setIsLoading(true);
        try {
            const tempConfig: ReportConfiguration = {
                ...config,
                id: crypto.randomUUID(),
                fechaCreacion: new Date().toISOString(),
                fechaActualizacion: new Date().toISOString(),
            };
            // Validate against the PARENT company's service package
            const validation = reportConfigStorage.validateConfiguration(tempConfig, campaign.empresaId);
            if (!validation.valid) {
                setValidationErrors(validation.errors);
                setIsLoading(false);
                return;
            }
            reportConfigStorage.createConfiguration(config);
            setValidationErrors([]);
            setOpen(false);
            onSaved?.();
        } catch (error) {
            console.error("Error guardando configuración:", error);
            setValidationErrors(["Error al guardar la configuración"]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadJSON = () => {
        if (!config) return;

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `reporte_config_${campaign.nombre.replace(/\s+/g, '_').toLowerCase()}.json`);
        document.body.appendChild(downloadAnchorNode); // required for firefox
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    return (
        <TooltipProvider>
            <Dialog open={open} onOpenChange={setOpen}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                                <LayoutDashboard className="h-4 w-4" />
                            </Button>
                        </DialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Configurar Reporte</TooltipContent>
                </Tooltip>
                {config && (
                    <DialogContent className="max-w-[90vw] sm:max-w-4xl lg:max-w-5xl max-h-[85vh] flex flex-col p-0">
                        <div className="px-6 pt-6 pb-4 shrink-0">
                            <DialogHeader>
                                <DialogTitle>Configurar Reporte - {campaign.nombre}</DialogTitle>
                                <DialogDescription>
                                    Personaliza los KPIs, gráficos y colores de la marca para esta campaña
                                </DialogDescription>
                            </DialogHeader>
                        </div>

                        <ScrollArea className="flex-1 px-6 overflow-y-auto">
                            <div className="space-y-6 py-4">
                                {validationErrors.length > 0 && (
                                    <Alert variant="destructive">
                                        <AlertCircle className="h-4 w-4" />
                                        <AlertDescription>
                                            <ul className="list-disc pl-4">
                                                {validationErrors.map((error, i) => (
                                                    <li key={i}>{error}</li>
                                                ))}
                                            </ul>
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {/* Colores de Marca */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <Palette className="h-4 w-4" />
                                            Colores de Marca
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-xs">Color Primario</Label>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded border overflow-hidden shrink-0">
                                                        <input
                                                            type="color"
                                                            value={config.paletaColores?.primario || "#000000"}
                                                            onChange={(e) => setConfig({
                                                                ...config,
                                                                paletaColores: {
                                                                    ...(config.paletaColores || { primario: "", secundario: "", acento: "" }),
                                                                    primario: e.target.value
                                                                }
                                                            })}
                                                            className="h-full w-full p-0 border-0 cursor-pointer"
                                                        />
                                                    </div>
                                                    <Input
                                                        value={config.paletaColores?.primario || "#000000"}
                                                        onChange={(e) => setConfig({
                                                            ...config,
                                                            paletaColores: {
                                                                ...(config.paletaColores || { primario: "", secundario: "", acento: "" }),
                                                                primario: e.target.value
                                                            }
                                                        })}
                                                        className="h-8 font-mono text-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Color Secundario</Label>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded border overflow-hidden shrink-0">
                                                        <input
                                                            type="color"
                                                            value={config.paletaColores?.secundario || "#ffffff"}
                                                            onChange={(e) => setConfig({
                                                                ...config,
                                                                paletaColores: {
                                                                    ...(config.paletaColores || { primario: "", secundario: "", acento: "" }),
                                                                    secundario: e.target.value
                                                                }
                                                            })}
                                                            className="h-full w-full p-0 border-0 cursor-pointer"
                                                        />
                                                    </div>
                                                    <Input
                                                        value={config.paletaColores?.secundario || "#ffffff"}
                                                        onChange={(e) => setConfig({
                                                            ...config,
                                                            paletaColores: {
                                                                ...(config.paletaColores || { primario: "", secundario: "", acento: "" }),
                                                                secundario: e.target.value
                                                            }
                                                        })}
                                                        className="h-8 font-mono text-xs"
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs">Color de Acento</Label>
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded border overflow-hidden shrink-0">
                                                        <input
                                                            type="color"
                                                            value={config.paletaColores?.acento || "#FFB000"}
                                                            onChange={(e) => setConfig({
                                                                ...config,
                                                                paletaColores: {
                                                                    ...(config.paletaColores || { primario: "", secundario: "", acento: "" }),
                                                                    acento: e.target.value
                                                                }
                                                            })}
                                                            className="h-full w-full p-0 border-0 cursor-pointer"
                                                        />
                                                    </div>
                                                    <Input
                                                        value={config.paletaColores?.acento || "#FFB000"}
                                                        onChange={(e) => setConfig({
                                                            ...config,
                                                            paletaColores: {
                                                                ...(config.paletaColores || { primario: "", secundario: "", acento: "" }),
                                                                acento: e.target.value
                                                            }
                                                        })}
                                                        className="h-8 font-mono text-xs"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Plantillas */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm">Cargar desde Plantilla</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Select onValueChange={loadTemplate}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar plantilla..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {templates.map((template) => (
                                                    <SelectItem key={template.id} value={template.id}>
                                                        <div className="flex items-center gap-2">
                                                            <FileText className="h-4 w-4" />
                                                            <span>{template.nombre}</span>
                                                            <Badge variant="outline" className="ml-2">
                                                                {template.categoria}
                                                            </Badge>
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </CardContent>
                                </Card>

                                {/* KPIs */}
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-sm">
                                                KPIs ({config.kpis.length}/{DEFAULT_LIMITS.maxKPIs})
                                            </CardTitle>
                                            <Button size="sm" onClick={addKPI}>
                                                <Plus className="h-4 w-4 md:mr-1" />
                                                <span className="hidden md:inline">Agregar KPI</span>
                                                <span className="md:hidden">KPI</span>
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        {config.kpis.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                No hay KPIs configurados
                                            </p>
                                        ) : (
                                            config.kpis.map((kpi) => (
                                                <div
                                                    key={kpi.id}
                                                    className="border rounded-lg p-2 sm:p-3 space-y-2 hover:bg-muted/50"
                                                >
                                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                                                        <div className="col-span-1 md:col-span-5">
                                                            <Label className="text-xs">Nombre</Label>
                                                            <Input
                                                                value={kpi.nombre}
                                                                onChange={(e) =>
                                                                    updateKPI(kpi.id, { nombre: e.target.value })
                                                                }
                                                                placeholder="Nombre del KPI"
                                                                className="h-8"
                                                            />
                                                        </div>
                                                        <div className="col-span-1 md:col-span-3">
                                                            <Label className="text-xs">Operación</Label>
                                                            <Select
                                                                value={kpi.operacion}
                                                                onValueChange={(value) =>
                                                                    updateKPI(kpi.id, { operacion: value as KPIOperation })
                                                                }
                                                            >
                                                                <SelectTrigger className="h-8">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {["mean", "sum", "count", "max", "min", "median", "std", "variance"].map((op) => (
                                                                        <SelectItem key={op} value={op}>
                                                                            {KPI_OPERATION_LABELS[op as KPIOperation]}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="col-span-1 md:col-span-3">
                                                            <Label className="text-xs">Fuente</Label>
                                                            <Select
                                                                value={kpi.fuente}
                                                                onValueChange={(value) =>
                                                                    updateKPI(kpi.id, { fuente: value as DataSource })
                                                                }
                                                            >
                                                                <SelectTrigger className="h-8">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {ALL_DATA_SOURCES.map((fuente) => (
                                                                        <SelectItem key={fuente} value={fuente}>
                                                                            {DATA_SOURCE_LABELS[fuente]}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="col-span-1 md:col-span-1 flex items-end">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => deleteKPI(kpi.id)}
                                                                className="h-8 w-8 p-0"
                                                            >
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Filas y Gráficos */}
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-sm">
                                                Dashboard ({config.filas.length}/{DEFAULT_LIMITS.maxFilas} filas)
                                            </CardTitle>
                                            <Button size="sm" onClick={addRow}>
                                                <Plus className="h-4 w-4 md:mr-1" />
                                                <span className="hidden md:inline">Agregar Fila</span>
                                                <span className="md:hidden">Fila</span>
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        {config.filas.length === 0 ? (
                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                No hay filas configuradas
                                            </p>
                                        ) : (
                                            config.filas.map((row) => (
                                                <div key={row.id} className="border rounded-lg p-4 space-y-3">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                                                            <span className="font-medium text-sm">Fila {row.orden}</span>
                                                            <Badge variant="outline" className="text-xs">
                                                                {row.graficos.length}/{DEFAULT_LIMITS.maxGraficosPorFila}{" "}
                                                                gráficos
                                                            </Badge>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Button size="sm" onClick={() => addChartToRow(row.id)}>
                                                                <Plus className="h-4 w-4 md:mr-1" />
                                                                <span className="hidden md:inline">Gráfico</span>
                                                                <span className="md:hidden">+</span>
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => deleteRow(row.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-3 pl-2 sm:pl-6">
                                                        {row.graficos.map((chart) => (
                                                            <div
                                                                key={chart.id}
                                                                className="border rounded p-2 sm:p-3 bg-muted/30 space-y-2"
                                                            >
                                                                <div className="grid grid-cols-1 sm:grid-cols-6 lg:grid-cols-12 gap-2">
                                                                    <div className="col-span-1 sm:col-span-6 lg:col-span-4">
                                                                        <Label className="text-xs">Título</Label>
                                                                        <Input
                                                                            value={chart.titulo}
                                                                            onChange={(e) =>
                                                                                updateChart(row.id, chart.id, {
                                                                                    titulo: e.target.value,
                                                                                })
                                                                            }
                                                                            className="h-8"
                                                                        />
                                                                    </div>
                                                                    <div className="col-span-1 sm:col-span-3 lg:col-span-3">
                                                                        <Label className="text-xs">Tipo</Label>
                                                                        <Select
                                                                            value={chart.tipo}
                                                                            onValueChange={(value) =>
                                                                                updateChart(row.id, chart.id, {
                                                                                    tipo: value as ChartType,
                                                                                })
                                                                            }
                                                                        >
                                                                            <SelectTrigger className="h-8">
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {ALL_CHART_TYPES.map((tipo) => (
                                                                                    <SelectItem key={tipo} value={tipo}>
                                                                                        {CHART_TYPE_LABELS[tipo]}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                    <div className="col-span-1 sm:col-span-3 lg:col-span-3">
                                                                        <Label className="text-xs">Fuente</Label>
                                                                        <Select
                                                                            value={chart.fuente}
                                                                            onValueChange={(value) =>
                                                                                updateChart(row.id, chart.id, {
                                                                                    fuente: value as DataSource,
                                                                                })
                                                                            }
                                                                        >
                                                                            <SelectTrigger className="h-8">
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {ALL_DATA_SOURCES.map((fuente) => (
                                                                                    <SelectItem key={fuente} value={fuente}>
                                                                                        {DATA_SOURCE_LABELS[fuente]}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                    <div className="col-span-1 sm:col-span-3 lg:col-span-1">
                                                                        <Label className="text-xs">Cols</Label>
                                                                        <Input
                                                                            type="number"
                                                                            min={1}
                                                                            max={12}
                                                                            value={chart.columnas}
                                                                            onChange={(e) => {
                                                                                const val = parseInt(e.target.value)
                                                                                updateChart(row.id, chart.id, {
                                                                                    columnas: (val >= 1 && val <= 12 ? val : 6) as BootstrapCol,
                                                                                })
                                                                            }}
                                                                            className="h-8"
                                                                        />
                                                                    </div>
                                                                    <div className="col-span-1 sm:col-span-3 lg:col-span-1 flex items-end">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            onClick={() => deleteChart(row.id, chart.id)}
                                                                            className="h-8 w-8 p-0"
                                                                        >
                                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                                        </Button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </ScrollArea>

                        <div className="px-6 py-4 border-t shrink-0">
                            <DialogFooter className="flex justify-between sm:justify-between w-full">
                                <Button variant="outline" onClick={handleDownloadJSON} disabled={isLoading} className="gap-2">
                                    <Download className="h-4 w-4" />
                                    Descargar JSON
                                </Button>
                                <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
                                        Cancelar
                                    </Button>
                                    <Button onClick={handleSave} disabled={isLoading}>
                                        <Save className="h-4 w-4 mr-2" />
                                        {isLoading ? "Guardando..." : "Guardar"}
                                    </Button>
                                </div>
                            </DialogFooter>
                        </div>
                    </DialogContent>
                )}
            </Dialog>
        </TooltipProvider>
    );
}
