import { useParams } from 'react-router-dom'

const TripDetail = () => {
  const { id } = useParams()

  return (
    <div>
      <h2 className="text-3xl font-bold mb-4">Trip Detail</h2>
      <p className="text-muted-foreground">Trip ID: {id}</p>
      <p className="text-muted-foreground">Will show expenses, balances, and settlement suggestions</p>
    </div>
  )
}

export default TripDetail
