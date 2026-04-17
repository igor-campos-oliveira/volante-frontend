import Card from "@/components/Card";
import SearchPage from "@/components/SearchPage";
import StatusDropDown from "@/components/BadgeDropDown/BadgeDropDown";
import CarPlate from "@/components/ui/plate";
import SelectOption from "@/components/ui/selectOptions";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DEBOUNCE_TIMEOUT,
  SO_STATUS_LIST,
  timestampToLocaleString,
  USE_QUERY_CONFIGS,
} from "@/data/constants/utils";
import useDebounce from "@/hooks/useDebounce";
import { currencyFormat, sortByCreatedAtDesc } from "@/lib/utils";
import { ROUTER_PATHS } from "@/routes/routes";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useServiceOrderStore } from "@/hooks/useServiceOrder";
import ServiceOrderAPI from "@/data/api/ServiceOrderAPI";
import { ServiceOrder, STATUS_SERVICE_ORDER } from "../ServiceOrder/types";

export default function SearchServiceOrdersPage() {
  const navigation = useNavigate();
  const { setServiceOrder } = useServiceOrderStore();
  const queryClient = useQueryClient();
  const [searchValue, setSearchValue] = useDebounce({ timeout: DEBOUNCE_TIMEOUT });
  const [filter, setFilter] = useState<"customer" | "vehicle">("customer");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | number | null>(null);

  const {
    data: serviceOrders,
    isLoading,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
    dataUpdatedAt,
  } = useInfiniteQuery({
    queryKey: ["get_service_orders", { searchValue, filter }],
    queryFn: async ({ pageParam = 1 }) =>
      ServiceOrderAPI.get(searchValue, pageParam, filter),
    ...USE_QUERY_CONFIGS,
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.meta.page + 1;
      return nextPage <= lastPage.meta.totalPages ? nextPage : undefined;
    },
  });

  const { mutateAsync: handleUpdateStatus } = useMutation({
    mutationFn: ({
      serviceOrderId,
      status,
    }: {
      serviceOrderId: string | number;
      status: STATUS_SERVICE_ORDER;
    }) => ServiceOrderAPI.updateStatus(serviceOrderId, status),
  });

  const handleCardClick = async (serviceOrder: ServiceOrder) => {
    await setServiceOrder({ ...serviceOrder });
    navigation(`${ROUTER_PATHS.SERVICE_ORDER}/${serviceOrder.uuid || serviceOrder.id}`, {
      state: { service_order: serviceOrder },
    });
  };

  const onChangeStatus = async (
    serviceOrder: ServiceOrder,
    nextStatus: STATUS_SERVICE_ORDER,
  ) => {
    const currentStatus = serviceOrder.status;
    const serviceOrderId = serviceOrder.id ?? serviceOrder.uuid;

    if (!serviceOrderId || currentStatus === nextStatus) {
      return;
    }

    try {
      setUpdatingOrderId(serviceOrderId);
      await handleUpdateStatus({ serviceOrderId, status: nextStatus });
      await queryClient.invalidateQueries({ queryKey: ["get_service_orders"] });
      toast.success("Status do orçamento atualizado.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Nao foi possivel atualizar o status do orçamento.";
      toast.error(message);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const serviceOrdersData = ((serviceOrders?.pages.flatMap((page) => page.data) ||
    []) as unknown) as ServiceOrder[];
  const sortedServiceOrdersData = sortByCreatedAtDesc(serviceOrdersData);
  const lastUpdatedAt =
    "Última atualização: " + timestampToLocaleString(dataUpdatedAt);

  const getOrderMetrics = (serviceOrder: ServiceOrder) => {
    const items = serviceOrder?.service_order_items || serviceOrder?.items || [];

    const itemsCount = items.length;
    const totalValue = items.reduce((acc, item) => {
      const quantity = Number(item?.quantity) || 0;
      const value = Number(item?.value) || 0;
      const discount = Number(item?.discount) || 0;
      const mappedTotal = Number(item?.total);

      return acc + (Number.isFinite(mappedTotal) ? mappedTotal : quantity * value - discount);
    }, 0);

    return { itemsCount, totalValue };
  };

  return (
    <SearchPage>
      <SearchPage.Title>Orçamentos</SearchPage.Title>
      <p className="text-sm text-muted-foreground">{lastUpdatedAt}</p>
      <SearchPage.SearchBar
        placeholder="Pesquise seus orçamentos aqui..."
        onChange={(e) => {
          setSearchValue(e.target.value);
        }}
      >
        <SelectOption
          className="mr-2 h-[50px] w-[120px] flex-grow-0"
          containerFlex="0"
          value={filter}
          onChange={setFilter}
          options={[
            { label: "Cliente", value: "customer" },
            { label: "Veículo", value: "vehicle" },
          ]}
        />
      </SearchPage.SearchBar>
      <Card.Container>
        {isLoading &&
          Array.from({ length: 8 }).map((_, index) => (
            <Skeleton
              key={`service-orders-skeleton-${index}`}
              className="h-[192px] w-full rounded-2xl"
            />
          ))}

        {!isLoading && sortedServiceOrdersData.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Nenhum orçamento encontrado.
          </div>
        )}

        {sortedServiceOrdersData.map((serviceOrder: ServiceOrder) => {
          const { itemsCount, totalValue } = getOrderMetrics(serviceOrder);

          return (
            <Card
              className="capitalize border-zinc-200/80 bg-gradient-to-b from-white to-zinc-50/60 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-12px_rgba(139,92,246,0.55)]"
              key={serviceOrder?.uuid}
              onClick={() => handleCardClick(serviceOrder)}
            >
              <Card.Header
                title={
                  serviceOrder?.vehicle?.brand || serviceOrder?.vehicle?.model
                    ? `${serviceOrder?.vehicle?.brand} ${serviceOrder?.vehicle?.model}`
                    : "Sem Veículo"
                }
                description={serviceOrder?.customer?.name || "Cliente não identificado"}
              >
                <Card.HeaderActions>
                  <div onClick={(e) => e.stopPropagation()}>
                    <StatusDropDown
                      title="Atualizar status"
                      value={serviceOrder.status}
                      options={SO_STATUS_LIST}
                      disabled={updatingOrderId === (serviceOrder.id ?? serviceOrder.uuid)}
                      onChange={(value) =>
                        onChangeStatus(serviceOrder, value as STATUS_SERVICE_ORDER)
                      }
                    />
                  </div>
                </Card.HeaderActions>
              </Card.Header>

              <Card.Content>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <CarPlate plate={serviceOrder?.vehicle?.plate || ""} />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-zinc-200 bg-white/70 p-2.5">
                      <p className="text-[11px] tracking-[0.08em] text-zinc-500">VALOR TOTAL</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">
                        {currencyFormat(totalValue, "currency")}
                      </p>
                    </div>
                    <div className="rounded-xl border border-zinc-200 bg-white/70 p-2.5">
                      <p className="text-[11px] tracking-[0.08em] text-zinc-500">ITENS</p>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">
                        {itemsCount} {itemsCount === 1 ? "item" : "itens"}
                      </p>
                    </div>
                  </div>
                </div>
              </Card.Content>
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
    </SearchPage>
  );
}
