import Card from '@/components/Card';
import SearchPage from '@/components/SearchPage';
import {
  DEBOUNCE_TIMEOUT,
  SO_STATUS_LIST,
  timestampToLocaleString,
  USE_QUERY_CONFIGS,
} from '@/data/constants/utils';
import useDebounce from '@/hooks/useDebounce';
import { isToday } from '@/lib/utils';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ServiceOrder } from '../ServiceOrder/types';
import { useNavigate } from 'react-router-dom';
import { ROUTER_PATHS } from '@/routes/routes';
import { useServiceOrderStore } from '@/hooks/useServiceOrder';
import StatusDropDown from '@/components/BadgeDropDown/BadgeDropDown';
import CarPlate from '@/components/ui/plate';
import SelectOption from '@/components/ui/selectOptions';
import { useState } from 'react';
import ServiceOrderAPI from '@/data/api/ServiceOrderAPI';

export default function SearchServiceOrdersPage() {
  const navigation = useNavigate();
  const { setServiceOrder } = useServiceOrderStore();
  const [searchValue, setSearchValue] = useDebounce({ timeout: DEBOUNCE_TIMEOUT });
  const [filter, setFilter] = useState<'customer' | 'vehicle'>('customer');

  const {
    data: serviceOrders,
    fetchNextPage,
    isFetchingNextPage,
    hasNextPage,
    dataUpdatedAt,
  } = useInfiniteQuery({
    queryKey: ['get_service_orders', { searchValue }],
    queryFn: async ({ pageParam = 1 }) =>
      (await ServiceOrderAPI.get(searchValue, pageParam, filter)).data,
    ...USE_QUERY_CONFIGS,
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.meta.page + 1;
      return nextPage <= lastPage.meta.totalPages ? nextPage : undefined;
    },
  });

  const handleCardClick = async (serviceOrder: ServiceOrder) => {
    await setServiceOrder({ ...serviceOrder });
    navigation(`${ROUTER_PATHS.SERVICE_ORDER}/${serviceOrder.uuid || serviceOrder.id}`, {
      state: { service_order: serviceOrder },
    });
  };

  const serviceOrdersData = serviceOrders?.pages.flatMap((page) => page.data) || [];
  const lastUpdatedAt = 'Última atualização: ' + timestampToLocaleString(dataUpdatedAt);

  return (
    <SearchPage>
      <SearchPage.Title>Orçamentos</SearchPage.Title>
      <p className="text-sm text-muted-foreground">{lastUpdatedAt}</p>
      <SearchPage.SearchBar
        placeholder="Pesquise seus orçamentos aqui..."
        onChange={(e) => {
          setSearchValue(e.target.value);
        }}>
        <SelectOption
          className="h-[50px] w-[120px] flex-grow-0 mr-2"
          containerFlex="0"
          value={filter}
          onChange={setFilter}
          options={[
            { label: 'Cliente', value: 'customer' },
            { label: 'Veículo', value: 'vehicle' },
          ]}
        />
      </SearchPage.SearchBar>
      <Card.Container>
        {serviceOrdersData.map((serviceOrder: ServiceOrder) => (
          <Card
            className="capitalize"
            key={serviceOrder?.uuid}
            onClick={() => handleCardClick(serviceOrder)}>
            {serviceOrder?.updatedAt && isToday(new Date(serviceOrder?.updatedAt)) && (
              <Card.Badge></Card.Badge>
            )}
            <Card.Header
              title={
                serviceOrder?.vehicle?.brand || serviceOrder?.vehicle?.model
                  ? `${serviceOrder?.vehicle?.brand} ${serviceOrder?.vehicle?.model}`
                  : 'Sem Veículo'
              }
              description={serviceOrder?.customer?.name || 'Cliente não identificado'}
            />
            <Card.Content>
              <div className="flex justify-between">
                <CarPlate plate={serviceOrder?.vehicle?.plate || ''} />
                <StatusDropDown
                  value={serviceOrder.status}
                  options={SO_STATUS_LIST}
                  disabled={true}
                  onChange={() => {}}
                />
              </div>
            </Card.Content>
          </Card>
        ))}
      </Card.Container>
      <SearchPage.LoadMore
        visible={hasNextPage}
        loading={isFetchingNextPage}
        onClick={() => fetchNextPage()}>
        Ver mais
      </SearchPage.LoadMore>
    </SearchPage>
  );
}
