import Card from "@/components/Card";
import SearchPage from "@/components/SearchPage";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  StockItem,
  deleteStockItemAPI,
  getStockItemsAPI,
  toggleStockItemStatusAPI,
} from "@/data/api/StockAPI";
import {
  DEBOUNCE_TIMEOUT,
  timestampToLocaleString,
  USE_QUERY_CONFIGS,
} from "@/data/constants/utils";
import useDebounce from "@/hooks/useDebounce";
import { currencyFormat, sortByCreatedAtDesc } from "@/lib/utils";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { AlertTriangle, MoreVertical, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import StockUpsertModal from "./StockUpsertModal";

const formatMoney = (value: number | null) =>
  value == null ? "-" : currencyFormat(value, "currency");

export default function StockPage() {
  const queryClient = useQueryClient();
  const [searchValue, setSearchValue] = useDebounce({ timeout: DEBOUNCE_TIMEOUT });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<StockItem | null>(null);

  const {
    data: stockItems,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    dataUpdatedAt,
  } = useInfiniteQuery({
    queryKey: ["get_stock_items", { searchValue }],
    queryFn: ({ pageParam = 1 }) => getStockItemsAPI(searchValue, pageParam),
    ...USE_QUERY_CONFIGS,
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.meta.page + 1;
      return nextPage <= lastPage.meta.totalPages ? nextPage : undefined;
    },
    initialPageParam: 1,
  });

  const stockData = stockItems?.pages.flatMap((page) => page.data) ?? [];
  const sortedStockData = useMemo(() => sortByCreatedAtDesc(stockData), [stockData]);
  const lastUpdatedAt = `Ultima atualização: ${timestampToLocaleString(dataUpdatedAt)}`;

  const { mutateAsync: handleToggleStatus, isPending: isTogglingStatus } = useMutation({
    mutationFn: async ({
      itemId,
      field,
      nextValue,
    }: {
      itemId: string;
      field: string;
      nextValue: boolean;
    }) => toggleStockItemStatusAPI(itemId, field, nextValue),
  });

  const { mutateAsync: handleDeleteStockItem, isPending: isDeleting } = useMutation({
    mutationFn: async (stockItemId: string) => deleteStockItemAPI(stockItemId),
  });

  const openCreateModal = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: StockItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const onToggleItemStatus = async (item: StockItem, nextValue: boolean) => {
    try {
      await handleToggleStatus({
        itemId: item.id,
        field: item.activeField,
        nextValue,
      });
      await queryClient.invalidateQueries({ queryKey: ["get_stock_items"] });
      toast.success("Status atualizado.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possivel atualizar o status.";
      toast.error(message);
    }
  };

  const onConfirmDelete = async () => {
    if (!itemToDelete?.id) {
      toast.error("Produto invalido para exclusão.");
      return;
    }

    try {
      await handleDeleteStockItem(itemToDelete.id);
      await queryClient.invalidateQueries({ queryKey: ["get_stock_items"] });
      toast.success("Produto removido.");
      setItemToDelete(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nao foi possivel remover o produto.";
      toast.error(message);
    }
  };

  return (
    <SearchPage>
      <SearchPage.Title>Estoque</SearchPage.Title>
      <p className="text-sm text-muted-foreground">{lastUpdatedAt}</p>

      <SearchPage.SearchBar
        placeholder="Pesquise os produtos do estoque..."
        onChange={(event) => {
          setSearchValue(event.target.value);
        }}
        posChildren={
          <Button variant="theme" className="h-[50px]" onClick={openCreateModal}>
            <Plus size={18} />
            Novo produto
          </Button>
        }
      />

      <Card.Container>
        {isLoading &&
          Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={`stock-skeleton-${index}`} className="h-[210px] w-full rounded-lg" />
          ))}

        {!isLoading && sortedStockData.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum produto encontrado.
          </div>
        )}

        {sortedStockData.map((item) => {
          const isLowStock = item.stockQuantity <= item.minimumStock;

          return (
            <Card
              key={item.id}
              className={`bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-12px_rgba(139,92,246,0.55)] ${
                isLowStock ? "border-orange-300" : ""
              }`}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <label
                    className={`flex items-center gap-2 text-sm text-zinc-600 ${
                      isTogglingStatus ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={item.isActive}
                      disabled={isTogglingStatus}
                      onChange={(event) => onToggleItemStatus(item, event.target.checked)}
                      className="peer sr-only"
                    />
                    <span
                      className={`relative inline-flex h-5 w-10 shrink-0 rounded-full transition-colors duration-200 ease-out ${
                        item.isActive ? "bg-[var(--theme-highlight)]" : "bg-zinc-300"
                      }`}
                    >
                      <span
                        className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-300 ease-out ${
                          item.isActive ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </span>
                    {item.isActive ? "Ativo" : "Inativo"}
                  </label>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        aria-label="Mais opcoes"
                      >
                        <MoreVertical size={18} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36">
                      <DropdownMenuItem
                        onSelect={() => openEditModal(item)}
                        className="cursor-pointer"
                      >
                        <Pencil size={16} className="mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={isDeleting}
                        onSelect={() => setItemToDelete(item)}
                        className="cursor-pointer text-destructive focus:text-destructive"
                      >
                        <Trash2 size={16} className="mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-700">
                    {item.category || "Sem categoria"}
                  </span>
                  {isLowStock && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700">
                      <AlertTriangle size={14} />
                      Baixo estoque
                    </span>
                  )}
                </div>

                <p className="line-clamp-1 text-base font-semibold text-zinc-900">{item.name}</p>

                <p className="line-clamp-2 text-sm text-zinc-500">
                  {item.description || "Sem descricao cadastrada."}
                </p>

                <div className="grid gap-1 text-xs text-zinc-500">
                  <p>Codigo: {item.barcode || "nao informado"}</p>
                  <p>Marca: {item.brand || "nao informada"}</p>
                  <p>Unidade: {item.unitMeasure}</p>
                </div>

                <div className="mt-auto border-t pt-2">
                  <div className="flex items-center justify-between text-sm">
                    <p className={isLowStock ? "font-semibold text-orange-700" : "text-zinc-600"}>
                      Estoque: {item.stockQuantity}
                    </p>
                    <p className="text-zinc-500">Minimo: {item.minimumStock}</p>
                  </div>
                  <p className="text-sm text-zinc-600">Custo: {formatMoney(item.costPrice)}</p>
                  <p className="text-base font-semibold text-zinc-900">
                    Venda: {formatMoney(item.salePrice)}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </Card.Container>

      <SearchPage.LoadMore
        visible={hasNextPage}
        loading={isFetchingNextPage}
        onClick={() => fetchNextPage()}
      >
        Ver mais
      </SearchPage.LoadMore>

      <Dialog
        open={Boolean(itemToDelete)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setItemToDelete(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Você realmente deseja excluir o produto{" "}
              <span className="font-medium text-foreground">
                {itemToDelete?.name || "selecionado"}
              </span>
              ? Esta acao nao pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setItemToDelete(null)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirmDelete}
              loading={isDeleting}
            >
              Excluir definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StockUpsertModal
        open={isModalOpen}
        item={editingItem}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setEditingItem(null);
          }
        }}
      />
    </SearchPage>
  );
}
