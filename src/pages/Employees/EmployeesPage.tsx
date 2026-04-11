import Card from "@/components/Card"
import SearchPage from "@/components/SearchPage"
import { getEmployeesAPI } from "@/data/api/EmployeesAPI"
import { DEBOUNCE_TIMEOUT, timestampToLocaleString, USE_QUERY_CONFIGS } from "@/data/constants/utils"
import useDebounce from "@/hooks/useDebounce"
import { useInfiniteQuery } from "@tanstack/react-query"
import {Phone, Mail, FileTextIcon} from "lucide-react"
import {Skeleton} from "@heroui/react";


export function List() {
  return (
    <div className="w-full max-w-sm space-y-4">
      {Array.from({length: 3}).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-4/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function EmployeesPage() {
  const [searchValue, setSearchValue] = useDebounce({ timeout: DEBOUNCE_TIMEOUT })

  const { data: employees, isFetchingNextPage, hasNextPage, fetchNextPage, dataUpdatedAt } = useInfiniteQuery({
    queryKey: ['get_all_employees', { searchValue }],
    queryFn: ({ pageParam = 1 }) => getEmployeesAPI(searchValue, pageParam),
    ...USE_QUERY_CONFIGS,
    getNextPageParam: (lastPage) => {
      const nextPage = lastPage.meta.page + 1
      return nextPage <= lastPage.meta.totalPages ? nextPage : undefined
    },
    initialPageParam: 1
  })

  const employeesData = employees?.pages.flatMap(page => page.data) || []
  const lastUpdatedAt = 'Última atualização: ' + timestampToLocaleString(dataUpdatedAt)

  return (
    <SearchPage>
      <SearchPage.Title>Funcionários</SearchPage.Title>
      <p className="text-sm text-muted-foreground">{lastUpdatedAt}</p>

      <SearchPage.SearchBar 
        placeholder="Pesquise os funcionários aqui..." 
        onChange={(e) => { setSearchValue(e.target.value) }} 
      />

      <div className="columns-1 md:columns-2 lg:columns-3 xl:columns-4 gap-3 space-y-3">
        {employeesData?.map((employee: any) => (
          <Card key={employee.id} className="break-inside-avoid">
            <Card.Header
              title={employee.nome || 'Sem Nome'}
              description={employee.cargo || 'Cargo não informado'}
            />

            <Card.Content>
              <p className="flex gap-2 text-sm mb-1"><FileTextIcon size={18}/>{employee.cpf || 'CPF não informado'}</p>
              <p className="flex gap-2 text-sm mb-1"><Phone size={18}/>{employee.telefone || '(00) 00000000'}</p>
              <p className="flex gap-2 text-sm"><Mail size={18}/>{employee.email || 'Não informado'}</p>
            </Card.Content>
          </Card>
        ))}
      </div>

      <SearchPage.LoadMore 
        visible={hasNextPage} 
        loading={isFetchingNextPage} 
        onClick={() => fetchNextPage()}
      >
        Ver mais
      </SearchPage.LoadMore>
    </SearchPage>
  )
}