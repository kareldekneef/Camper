'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Download, Upload, Trash2, RotateCcw, Sun, Moon, Monitor } from 'lucide-react';
import { defaultCategories, defaultMasterItems } from '@/lib/seed-data';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');
  const { theme, setTheme } = useTheme();

  const handleExport = () => {
    const raw = localStorage.getItem('camperpack-storage');
    if (!raw) return;
    const blob = new Blob([raw], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `camperpack-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          localStorage.setItem('camperpack-storage', JSON.stringify(data));
          setImportStatus('Import gelukt! Pagina wordt herladen...');
          setTimeout(() => window.location.reload(), 1000);
        } catch {
          setImportStatus('Fout bij import. Controleer het bestand.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleResetMasterList = () => {
    useAppStore.setState({
      categories: defaultCategories,
      masterItems: defaultMasterItems,
    });
    setShowResetConfirm(false);
  };

  const handleClearAll = () => {
    localStorage.removeItem('camperpack-storage');
    window.location.reload();
  };

  const themeOptions = [
    { value: 'light' as const, label: 'Licht', icon: Sun },
    { value: 'dark' as const, label: 'Donker', icon: Moon },
    { value: 'system' as const, label: 'Systeem', icon: Monitor },
  ];

  return (
    <div className="mx-auto max-w-lg px-4 pt-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Instellingen</h1>
      </div>

      <div className="space-y-4">
        {/* Theme */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Thema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-sm transition-colors',
                    theme === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <opt.icon className="h-5 w-5" />
                  <span className="text-xs font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Data */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Gegevens</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Backup exporteren (JSON)
            </Button>
            <Button variant="outline" className="w-full justify-start gap-2" onClick={handleImport}>
              <Upload className="h-4 w-4" />
              Backup importeren
            </Button>
            {importStatus && (
              <p className="text-sm text-muted-foreground">{importStatus}</p>
            )}
          </CardContent>
        </Card>

        {/* Master list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Standaardlijst</CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Standaardlijst herstellen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Standaardlijst herstellen?</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Dit vervangt je huidige standaardlijst door de originele lijst. Bestaande trips worden niet beïnvloed.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
                    Annuleren
                  </Button>
                  <Button onClick={handleResetMasterList}>
                    Herstellen
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Danger */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-destructive">Gevaarlijke zone</CardTitle>
          </CardHeader>
          <CardContent>
            <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="w-full justify-start gap-2">
                  <Trash2 className="h-4 w-4" />
                  Alle gegevens wissen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Alle gegevens wissen?</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  Dit verwijdert al je trips, items en instellingen. Dit kan niet ongedaan worden. Maak eerst een backup!
                </p>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
                    Annuleren
                  </Button>
                  <Button variant="destructive" onClick={handleClearAll}>
                    Alles wissen
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground py-4">
          CamperPack v4.0 — Gebouwd met ❤️ voor camperreizen
        </div>
      </div>
    </div>
  );
}
