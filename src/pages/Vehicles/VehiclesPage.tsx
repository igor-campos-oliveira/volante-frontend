import Card from "@/components/Card";
import SearchPage from "@/components/SearchPage";
import CarPlate from "@/components/ui/plate";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  deleteVehicle,
  getVehiclesAPI,
  Vehicle,
} from "@/data/api/VehiclesAPI";
import {
  DEBOUNCE_TIMEOUT,
  timestampToLocaleString,
  USE_QUERY_CONFIGS,
} from "@/data/constants/utils";
import { CAR_FUELS } from "@/data/constants/carBrands";
import { COLORS } from "@/data/constants/colors";
import useDebounce from "@/hooks/useDebounce";
import { isToday, sortByCreatedAtDesc } from "@/lib/utils";
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import {
  FuelIcon,
  MoreVertical,
  PaletteIcon,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import VehicleUpsertModal from "./VehicleUpsertModal";

const normalize = (value?: string | null) =>
  String(value || "")
    .trim()
    .toLowerCase();

export default function VehiclesPage() {
  const queryClient = useQueryClient();
  const [searchValue, setSearchValue] = useDebounce({
    timeout: DEBOUNCE_TIMEOUT,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);

  const {
    data: vehicles,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    dataUpdatedAt,
  } = useInfiniteQuery({
    queryKey: ["get_all_vehicles", { searchValue }],
    queryFn: ({ pageParam = 1 }) => getVehiclesAPI(searchValue, pageParam),
    ...USE_QUERY_CONFIGS,
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.meta.page + 1;
      return nextPage <= lastPage.meta.totalPages ? nextPage : undefined;
    },
    initialPageParam: 1,
  });

  const vehiclesData = vehicles?.pages.flatMap((page) => page.data) || [];
  const sortedVehiclesData = sortByCreatedAtDesc(vehiclesData);
  const lastUpdatedAt =
    "Ultima atualizacao: " + timestampToLocaleString(dataUpdatedAt);

  const openCreateModal = () => {
    setEditingVehicle(null);
    setIsModalOpen(true);
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setIsModalOpen(true);
  };

  const { mutateAsync: handleDeleteVehicle, isPending: isDeleting } =
    useMutation({
      mutationFn: async (vehicleId: string | number) => deleteVehicle(vehicleId),
    });

  const openDeleteConfirm = (vehicle: Vehicle) => {
    setVehicleToDelete(vehicle);
  };

  const closeDeleteConfirm = () => {
    if (isDeleting) {
      return;
    }
    setVehicleToDelete(null);
  };

  const confirmDelete = async () => {
    if (!vehicleToDelete?.id) {
      toast.error("Veiculo invalido para exclusao.");
      return;
    }

    try {
      await handleDeleteVehicle(vehicleToDelete.id);
      await queryClient.invalidateQueries({ queryKey: ["get_all_vehicles"] });
      toast.success("Veiculo removido.");
      setVehicleToDelete(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel remover o veiculo.";
      toast.error(message);
    }
  };

  return (
    <SearchPage>
      <SearchPage.Title>Veiculos</SearchPage.Title>
      <p className="text-sm text-muted-foreground">{lastUpdatedAt}</p>
      <SearchPage.SearchBar
        placeholder="Pesquise os veiculos aqui..."
        onChange={(e) => {
          setSearchValue(e.target.value);
        }}
        posChildren={
          <Button variant="theme" className="h-[50px]" onClick={openCreateModal}>
            <Plus size={18} />
            Novo veiculo
          </Button>
        }
      />
      <Card.Container>
        {isLoading &&
          Array.from({ length: 8 }).map((_, index) => (
            <Skeleton
              key={`vehicles-skeleton-${index}`}
              className="h-[170px] w-full rounded-lg"
            />
          ))}

        {!isLoading && sortedVehiclesData.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum veiculo encontrado.
          </div>
        )}
        {sortedVehiclesData.map((vehicle: Vehicle) => {
          const normalizedColor = normalize(vehicle.cor);
          const normalizedFuel = normalize(vehicle.combustivel);

          const colorLabel =
            COLORS.find(
              (item) =>
                normalize(item.value) === normalizedColor ||
                normalize(item.label) === normalizedColor
            )?.label ||
            vehicle.cor ||
            "Cor nao informada";
          const fuelLabel =
            CAR_FUELS.find(
              (item) =>
                normalize(item.value) === normalizedFuel ||
                normalize(item.label) === normalizedFuel
            )?.label ||
            vehicle.combustivel ||
            "Combustivel nao informado.";

          return (
            <Card
              key={vehicle.id}
              className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-12px_rgba(139,92,246,0.55)]"
            >
              <Card.Header
                title={
                  vehicle.marca || vehicle.modelo
                    ? `${vehicle.marca || ""} ${vehicle.modelo || ""}`.trim()
                    : "Sem veiculo"
                }
                description={vehicle.ano ? String(vehicle.ano) : "Ano nao informado"}
              >
                <div className="flex items-center gap-1">
                  <CarPlate plate={vehicle.placa || ""} />
                  <Card.HeaderActions>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Card.Action
                          aria-label="Mais opcoes"
                          icon={<MoreVertical size={18} />}
                        />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem
                          onSelect={() => openEditModal(vehicle)}
                          className="cursor-pointer"
                        >
                          <Pencil size={16} className="mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={isDeleting}
                          onSelect={() => openDeleteConfirm(vehicle)}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          <Trash2 size={16} className="mr-2" />
                          Deletar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Card.HeaderActions>
                </div>
              </Card.Header>

              <Card.Content>
                <p className="mb-1 flex gap-2 text-sm">
                  <PaletteIcon size={18} />
                  {colorLabel}
                </p>
                <p className="mb-1 flex gap-2 text-sm">
                  <FuelIcon size={18} />
                  {fuelLabel}
                </p>
              </Card.Content>
              {vehicle.updatedAt && isToday(new Date(vehicle.updatedAt)) && (
                <Card.Badge> </Card.Badge>
              )}
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
      <VehicleUpsertModal
        open={isModalOpen}
        vehicle={editingVehicle}
        onOpenChange={(open: boolean) => {
          setIsModalOpen(open);
          if (!open) {
            setEditingVehicle(null);
          }
        }}
      />
      <Dialog
        open={Boolean(vehicleToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            closeDeleteConfirm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar exclusão</DialogTitle>
            <DialogDescription>
              Você realmente deseja excluir o veiculo{" "}
              <span className="font-medium text-foreground">
                {`${vehicleToDelete?.marca || ""} ${vehicleToDelete?.modelo || ""}`.trim() || "selecionado"}
              </span>
              ? Está ação não pode ser desfeita e removerá o registro
              definitivamente do banco de dados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="transition-colors hover:!bg-violet-100"
              onClick={closeDeleteConfirm}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={confirmDelete}
              loading={isDeleting}
            >
              Excluir definitivamente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SearchPage>
  );
}
