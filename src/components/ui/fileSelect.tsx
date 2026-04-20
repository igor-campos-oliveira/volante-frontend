import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Input } from './input';
import { Label } from './label';
import { ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './button';

interface FileSelectProps {
  label: string;
  files?: any[];
  onChange: (files: File[] | null | undefined) => void;
  onClear?: () => void;
  onRemoveLocalFile?: (file: File) => void;
  resetSignal?: number;
}

const FileSelect = ({ label, files = [], onChange, onClear, onRemoveLocalFile, resetSignal }: FileSelectProps) => {
  const [data, setData] = useState<File[]>([]);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const getRemoteName = (file: any) => {
    if (file?.name) return String(file.name);
    if (file?.object_name) {
      const parts = String(file.object_name).split('/');
      return parts[parts.length - 1] || String(file.object_name);
    }
    if (file?.url) {
      const cleanUrl = String(file.url).split('?')[0];
      const parts = cleanUrl.split('/');
      return parts[parts.length - 1] || cleanUrl;
    }
    return '';
  };

  const remoteFiles = Array.isArray(files) ? files : [];
  const dedupedRemoteFiles = Array.from(
    new Map(
      remoteFiles.map((file: any) => {
        const key = String(file?.object_name || file?.name || file?.url || Math.random());
        return [key, file];
      }),
    ).values(),
  );
  const remoteNames = new Set(
    dedupedRemoteFiles
      .map((file: any) => getRemoteName(file))
      .filter(Boolean),
  );
  const dedupedLocalFiles = Array.from(
    new Map(
      data.map((file: File) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        return [key, file];
      }),
    ).values(),
  ).filter((file: File) => !remoteNames.has(file.name));

  useEffect(() => {
    setData([]);
    if (fileInput.current) {
      fileInput.current.value = '';
    }
  }, [resetSignal]);

  const onInputChangeHandle = (e: ChangeEvent<HTMLInputElement>) => {
    const newFiles = Object.values(e.target?.files || {}) as File[];
    if (!newFiles.length) return;

    const allFiles = [...data, ...newFiles];

    if (allFiles.length > 12) {
      toast.error('Maximo de 12 arquivos.');
    } else {
      setData(allFiles);
      onChange(newFiles);
    }

    e.target.value = '';
  };

  const onCleanHandle = (e: any) => {
    e.preventDefault();
    setData([]);
    if (fileInput.current) {
      fileInput.current.value = '';
    }
    onClear?.();
  };

  const dispatchClick = (e: any) => {
    e.preventDefault();
    fileInput.current?.click();
  };

  const removeLocalFile = (fileToRemove: File) => {
    const fileKeyToRemove = `${fileToRemove.name}-${fileToRemove.size}-${fileToRemove.lastModified}`;
    setData((previousFiles) =>
      previousFiles.filter((file) => `${file.name}-${file.size}-${file.lastModified}` !== fileKeyToRemove),
    );
    onRemoveLocalFile?.(fileToRemove);
  };

  return (
    <span>
      <Label htmlFor="file" className="font-bold">
        {label} <span className="text-muted-foreground">{`${data.length}/12`}</span>
      </Label>
      <Input
        ref={(e) => (fileInput.current = e)}
        className="hidden"
        id="file"
        type="file"
        multiple
        onChange={(e) => onInputChangeHandle(e)}
        accept=".png,.jpeg, .jpg"
      />
      <span className="flex flex-wrap gap-2 mt-2">
        {dedupedRemoteFiles.map((file: any) => {
            return (
              <div
                key={String(file.object_name || file.url || file.name)}
                className="relative w-[120px] h-[120px]"
              >
                <img
                  src={file.url || URL.createObjectURL(file)}
                  className="w-[120px] h-[120px] border object-cover rounded-lg hover:scale-95"
                />
              </div>
            );
          })}
        {dedupedLocalFiles.map((file: File) => {
            return (
              <div
                key={`${file.name}-${file.size}-${file.lastModified}`}
                className="relative w-[120px] h-[120px]"
              >
                <img
                  src={URL.createObjectURL(file)}
                  className="w-[120px] h-[120px] border object-cover rounded-lg hover:scale-95"
                />
                <button
                  type="button"
                  onClick={() => removeLocalFile(file)}
                  aria-label={`Remover ${file.name}`}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full border bg-white text-red-600 shadow-sm hover:bg-red-50"
                >
                  <X size={14} className="mx-auto" />
                </button>
              </div>
            );
          })}
        <button
          onClick={dispatchClick}
          className="w-[120px] h-[120px] border-dashed hover:border-[--theme-highlight] hover:text-[--theme-highlight] flex items-center justify-center border object-cover rounded-lg border-zinc-400 text-zinc-400">
          <ImagePlus size={21} />
        </button>
      </span>
      <Button onClick={onCleanHandle} size={'sm'} variant={'outline'} className="mt-3">
        Limpar
      </Button>
    </span>
  );
};

export default FileSelect;
