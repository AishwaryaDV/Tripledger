import { useParams } from 'react-router-dom'

const Settle = () => {
  const { id } = useParams()

  return (
    <div>
      <h2 className="text-3xl font-bold mb-4">Settle Up</h2>
      <p className="text-muted-foreground">Trip ID: {id}</p>
      <p className="text-muted-foreground">Will show who owes whom and settlement suggestions</p>
    </div>
  )
}

export default Settle
