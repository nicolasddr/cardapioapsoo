'use client'

interface OrderStatusTrackerProps {
  status: 'Recebido' | 'Em Preparo' | 'Pronto'
  orderType: 'Retirada' | 'Consumo no Local'
}

export function OrderStatusTracker({
  status,
  orderType,
}: OrderStatusTrackerProps) {
  const stages = [
    { key: 'Recebido', label: 'Recebido' },
    { key: 'Em Preparo', label: 'Em Preparo' },
    { key: 'Pronto', label: 'Pronto' },
  ]

  const getStageStatus = (stageKey: string) => {
    const currentIndex = stages.findIndex((s) => s.key === status)
    const stageIndex = stages.findIndex((s) => s.key === stageKey)

    if (stageIndex < currentIndex) return 'completed'
    if (stageIndex === currentIndex) return 'current'
    return 'pending'
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {stages.map((stage, index) => {
          const stageStatus = getStageStatus(stage.key)
          const isCompleted = stageStatus === 'completed'
          const isCurrent = stageStatus === 'current'

          return (
            <div key={stage.key} className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  isCompleted
                    ? 'bg-green-600 text-white'
                    : isCurrent
                      ? 'bg-yellow-500 text-white animate-pulse'
                      : 'bg-gray-200 text-gray-600'
                }`}
              >
                {isCompleted ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              <div className="flex-1">
                <div
                  className={`font-semibold ${
                    isCurrent ? 'text-yellow-600' : isCompleted ? 'text-green-600' : 'text-gray-600'
                  }`}
                >
                  {stage.label}
                </div>
                {isCurrent && (
                  <div className="text-sm text-gray-600">
                    {stage.key === 'Recebido'
                      ? 'Seu pedido foi recebido pela cozinha'
                      : stage.key === 'Em Preparo'
                        ? 'Estamos preparando seu pedido'
                        : null}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {status === 'Pronto' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-6 h-6 text-green-600 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <div className="font-semibold text-green-900 mb-1">
                Pedido Pronto! 🎉
              </div>
              <p className="text-sm text-green-800">
                {orderType === 'Retirada'
                  ? 'Você pode retirar na recepção.'
                  : 'Aguarde o garçom.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

