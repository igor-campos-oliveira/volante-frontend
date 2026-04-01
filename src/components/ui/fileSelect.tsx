import { ChangeEvent, useRef, useState } from 'react';
import { Input } from './input';
import { Label } from './label';
import { ImagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from './button';

interface FileSelectProps {
  label: string;
  files?: any[];
  onChange: (files: any[]) => void;
}

const FileSelect = ({ label, files = [], onChange }: FileSelectProps) => {
  const [data, setData] = useState<any>([]);
  const fileInput = useRef<any>();

  const onInputChangeHandle = (e: ChangeEvent<HTMLInputElement>) => {
    const newFiles = Object.values(e.target?.files || {});
    const allFiles = [...data, ...newFiles];

    if (allFiles.length > 12) {
      toast.error('Máximo de 12 arquivos.');
    } else {
      setData(allFiles);
      onChange(allFiles);
    }
  };

  const onCleanHandle = (e: any) => {
    e.preventDefault();
    setData([]);
  };

  const dispatchClick = (e: any) => {
    e.preventDefault();
    fileInput.current.click();
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
        // multiple
        onChange={(e) => onInputChangeHandle(e)}
        accept=".png,.jpeg, .jpg"
      />
      <span className="flex flex-wrap gap-2 mt-2">
        {files &&
          files.map((file: any) => {
            return (
              <img
                key={file.name}
                src={file.url || URL.createObjectURL(file)}
                className="w-[120px] h-[120px] border object-cover rounded-lg hover:scale-95"
              />
            );
          })}
        {data &&
          data.map((file: any) => {
            return (
              <img
                key={file.name}
                src={file.url || URL.createObjectURL(file)}
                className="w-[120px] h-[120px] border object-cover rounded-lg hover:scale-95"
              />
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
