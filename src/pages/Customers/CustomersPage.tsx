import Card from "@/components/Card"
import SearchPage from "@/components/SearchPage"
import { getCostomersAPI } from "@/data/api/CustomersAPI"
import { DEBOUNCE_TIMEOUT, timestampToLocaleString, USE_QUERY_CONFIGS } from "@/data/constants/utils"
import useDebounce from "@/hooks/useDebounce"
import { isToday } from "@/lib/utils"
import { useInfiniteQuery } from "@tanstack/react-query"
import { Home, Mail, Phone } from "lucide-react"
import {Skeleton} from "@heroui/react";

export function Grid() {
  return (
    <div className="grid w-full max-w-xl grid-cols-3 gap-4">
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
      <Skeleton className="h-24 rounded-xl" />
    </div>
  );
}

export default function CustomersPage() {
  const [searchValue, setSearchValue] = useDebounce({timeout: DEBOUNCE_TIMEOUT})

  const {data: customers, fetchNextPage, isFetchingNextPage, hasNextPage, dataUpdatedAt} = useInfiniteQuery({
    queryKey: ['get_customers', {searchValue}],
    queryFn: ({pageParam = 1}) => getCostomersAPI(searchValue, pageParam),
    ...USE_QUERY_CONFIGS,
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.meta.page + 1;
      return nextPage <= lastPage.meta.totalPages ? nextPage : undefined;
    }
  })
  const customersData = customers?.pages.flatMap((page) => page.data) || [];
  const lastUpdatedAt = 'Última atualização: ' + timestampToLocaleString(dataUpdatedAt)

  return (
    <SearchPage>
      <SearchPage.Title>Clientes</SearchPage.Title>
      <p className="text-sm text-muted-foreground">{lastUpdatedAt}</p>
      <SearchPage.SearchBar placeholder="Pesquise seus clientes aqui..."  onChange={(e) => {setSearchValue(e.target.value)}}/>
      <Card.Container>
        {customersData.map((customer: any) => (
          <Card key={customer.id}>
            {isToday(new Date(customer.updatedAt)) && <Card.Badge> </Card.Badge>}
            <Card.Header fallback={customer?.nome?.substring(0,1) || '?'} title={customer.nome || 'Nome não informado'} description={customer.tipo_documento ? `${customer.tipo_documento.toUpperCase()}: ${customer.numero_documento}` : 'Documento não informado'} >
              {/* <Card.HeaderActions>
                <Card.Action icon={<Mail size={18}/>}/>
                <Card.Action icon={<Phone size={18}/>}/>
              </Card.HeaderActions> */}
            </Card.Header>
            <Card.Content>
              <p className="flex gap-2 text-sm mb-1"><Phone size={18}/>{customer.telefone || '(00) 00000000'}</p>
              <p className="flex gap-2 text-sm"><Mail size={18}/>{customer.email || 'não@informado.com'}</p>
              <p className="flex gap-2 text-sm mt-1"><Home size={18}/>{customer.endereco || 'não informado'}</p>
            </Card.Content>
          </Card>
        ))}
        </Card.Container>
        <SearchPage.LoadMore visible={hasNextPage} loading={isFetchingNextPage} onClick={() => fetchNextPage()} >Ver mais</SearchPage.LoadMore>
    </SearchPage>
  )
}