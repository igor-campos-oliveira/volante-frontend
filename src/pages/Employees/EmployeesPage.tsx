import Card from "@/components/Card"
import SearchPage from "@/components/SearchPage"
import { getEmployeesAPI } from "@/data/api/EmployeesAPI"
import { DEBOUNCE_TIMEOUT, timestampToLocaleString, USE_QUERY_CONFIGS } from "@/data/constants/utils"
import useDebounce from "@/hooks/useDebounce"
import { useInfiniteQuery } from "@tanstack/react-query"

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
      <SearchPage.SearchBar placeholder="Pesquise os funcionários aqui..." onChange={(e) => { setSearchValue(e.target.value) }} />
      <Card.Container>
        {employeesData?.map((employee: any) => (
          <Card key={employee.id}>
            <Card.Header
              title={employee.nome || 'Sem Nome'}
              description={employee.cargo || 'Cargo não informado'}
            >
            </Card.Header>

            <Card.Content>
              <p><strong>CPF:</strong> {employee.cpf || 'Não informado'}</p>
              <p><strong>Telefone:</strong> {employee.telefone || 'Não informado'}</p>
              <p><strong>Email:</strong> {employee.email || 'Não informado'}</p>
            </Card.Content>
          </Card>
        ))}
      </Card.Container>
      <SearchPage.LoadMore visible={hasNextPage} loading={isFetchingNextPage} onClick={() => fetchNextPage()}>Ver mais</SearchPage.LoadMore>
    </SearchPage>
  )
}