import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent,
} from "@/components/ui/menubar";
import {
  Folder,
  FolderPlus,
  FileText,
  Settings,
  Download,
  Eye,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize,
  Info,
} from "lucide-react";

interface AppMenuBarProps {
  onFitView?: () => void;
  onReanalyze?: () => void;
  onExport?: () => void;
  repoName?: string;
}

export default function AppMenuBar({ onFitView, onReanalyze, onExport, repoName }: AppMenuBarProps) {
  return (
    <Menubar className="bg-card border-0 border-b border-border rounded-none h-8 px-1 shadow-none">
      <MenubarMenu>
        <MenubarTrigger className="text-xs px-2 py-1 font-medium">File</MenubarTrigger>
        <MenubarContent className="min-w-[180px]">
          <MenubarItem className="text-xs flex items-center gap-2" onClick={onReanalyze}>
            <RotateCcw className="w-3.5 h-3.5" />
            Re-analyze Repository
          </MenubarItem>
          <MenubarSeparator />
          <MenubarItem className="text-xs flex items-center gap-2" onClick={onExport}>
            <Download className="w-3.5 h-3.5" />
            Export Graph
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger className="text-xs px-2 py-1 font-medium">View</MenubarTrigger>
        <MenubarContent className="min-w-[180px]">
          <MenubarItem className="text-xs flex items-center gap-2" onClick={onFitView}>
            <Maximize className="w-3.5 h-3.5" />
            Fit to Screen
          </MenubarItem>
          <MenubarSeparator />
          <MenubarSub>
            <MenubarSubTrigger className="text-xs">Layout</MenubarSubTrigger>
            <MenubarSubContent className="min-w-[140px]">
              <MenubarItem className="text-xs">Tree (Top Down)</MenubarItem>
              <MenubarItem className="text-xs">Horizontal</MenubarItem>
            </MenubarSubContent>
          </MenubarSub>
        </MenubarContent>
      </MenubarMenu>

      <MenubarMenu>
        <MenubarTrigger className="text-xs px-2 py-1 font-medium">Help</MenubarTrigger>
        <MenubarContent className="min-w-[180px]">
          <MenubarItem className="text-xs flex items-center gap-2">
            <Info className="w-3.5 h-3.5" />
            About Odin
          </MenubarItem>
        </MenubarContent>
      </MenubarMenu>

      {repoName && (
        <div className="flex-1 flex justify-center items-center">
          <span className="text-[10px] text-muted-foreground font-mono">{repoName}</span>
        </div>
      )}
    </Menubar>
  );
}
