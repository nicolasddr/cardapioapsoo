'use client'

import { useEffect, useState } from 'react'
import { useToast, Toast } from '@/src/components/ui/Toast'
import { OptionGroupModal } from '@/src/components/admin/OptionGroupModal'
import { OptionModal } from '@/src/components/admin/OptionModal'
import { DeleteConfirmModal } from '@/src/components/admin/DeleteConfirmModal'

interface OptionGroupData {
  id: string
  name: string
  selectionType: 'single' | 'multiple'
  optionCount?: number
}

interface OptionData {
  id: string
  name: string
  additionalPrice: number
  optionGroupId: string
  optionGroupName?: string
}

export default function OptionsPage() {
  const toast = useToast()
  const [optionGroups, setOptionGroups] = useState<OptionGroupData[]>([])
  const [options, setOptions] = useState<OptionData[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null)

  const [isGroupModalOpen, setGroupModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<OptionGroupData | null>(null)

  const [isOptionModalOpen, setOptionModalOpen] = useState(false)
  const [editingOption, setEditingOption] = useState<OptionData | null>(null)

  const [deleteConfirm, setDeleteConfirm] = useState<{
    isOpen: boolean
    type: 'group' | 'option'
    id: string
    name: string
    optionCount?: number
  }>({
    isOpen: false,
    type: 'group',
    id: '',
    name: '',
  })
  const [isDeleting, setDeleting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [groupsRes, optionsRes] = await Promise.all([
        fetch('/api/admin/option-groups'),
        fetch('/api/admin/options'),
      ])

      if (!groupsRes.ok || !optionsRes.ok) {
        throw new Error('Erro ao carregar dados')
      }

      const groupsData = await groupsRes.json()
      const optionsData = await optionsRes.json()

      const groupsWithCount = (groupsData.data ?? []).map((group: OptionGroupData) => ({
        ...group,
        optionCount: (optionsData.data ?? []).filter(
          (o: OptionData) => o.optionGroupId === group.id
        ).length,
      }))

      const optionsWithGroupNames = (optionsData.data ?? []).map((option: OptionData) => ({
        ...option,
        optionGroupName:
          groupsData.data?.find((g: OptionGroupData) => g.id === option.optionGroupId)?.name ??
          'Sem grupo',
      }))

      setOptionGroups(groupsWithCount)
      setOptions(optionsWithGroupNames)
    } catch (error) {
      toast.showToast('Erro', 'Não foi possível carregar os dados')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const filteredOptions = selectedGroupId
    ? options.filter((o) => o.optionGroupId === selectedGroupId)
    : options

  function handleCreateGroup() {
    setEditingGroup(null)
    setGroupModalOpen(true)
  }

  function handleEditGroup(group: OptionGroupData) {
    setEditingGroup(group)
    setGroupModalOpen(true)
  }

  function handleDeleteGroup(group: OptionGroupData) {
    setDeleteConfirm({
      isOpen: true,
      type: 'group',
      id: group.id,
      name: group.name,
      optionCount: group.optionCount,
    })
  }

  function handleCreateOption() {
    if (optionGroups.length === 0) {
      toast.showToast('Aviso', 'Crie um grupo de opcionais primeiro')
      return
    }
    setEditingOption(null)
    setOptionModalOpen(true)
  }

  function handleEditOption(option: OptionData) {
    setEditingOption(option)
    setOptionModalOpen(true)
  }

  function handleDeleteOption(option: OptionData) {
    setDeleteConfirm({
      isOpen: true,
      type: 'option',
      id: option.id,
      name: option.name,
    })
  }

  async function confirmDelete() {
    setDeleting(true)

    try {
      const url =
        deleteConfirm.type === 'group'
          ? `/api/admin/option-groups?id=${deleteConfirm.id}`
          : `/api/admin/options?id=${deleteConfirm.id}`

      const response = await fetch(url, { method: 'DELETE' })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao excluir')
      }

      toast.showToast(
        'Sucesso!',
        deleteConfirm.type === 'group'
          ? 'Grupo excluído com sucesso'
          : 'Opcional excluído com sucesso'
      )
      loadData()
      setDeleteConfirm({ isOpen: false, type: 'group', id: '', name: '' })
    } catch (error) {
      toast.showToast('Erro', error instanceof Error ? error.message : 'Erro ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <>
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Opcionais</h1>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
        <Toast
          open={toast.open}
          onOpenChange={toast.onOpenChange}
          title={toast.title}
          description={toast.description}
        />
      </>
    )
  }

  return (
    <>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Opcionais</h1>
          <div className="space-x-2">
            <button
              onClick={handleCreateGroup}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Novo Grupo
            </button>
            <button
              onClick={handleCreateOption}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Novo Opcional
            </button>
          </div>
        </div>

        {optionGroups.length === 0 && options.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum grupo de opcionais criado
            </h3>
            <p className="text-gray-600 mb-4">
              Comece criando um grupo para organizar seus opcionais.
            </p>
            <button
              onClick={handleCreateGroup}
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Criar primeiro grupo de opcionais
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Grupos</h2>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedGroupId(null)}
                    className={`w-full text-left px-3 py-2 rounded-md ${
                      selectedGroupId === null
                        ? 'bg-green-100 text-green-900 font-medium'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    Todos ({options.length})
                  </button>
                  {optionGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroupId(group.id)}
                      className={`w-full text-left px-3 py-2 rounded-md ${
                        selectedGroupId === group.id
                          ? 'bg-green-100 text-green-900 font-medium'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span>
                            {group.name} ({group.optionCount ?? 0})
                          </span>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              group.selectionType === 'single'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                          >
                            {group.selectionType === 'single' ? 'Única' : 'Múltipla'}
                          </span>
                        </div>
                        {selectedGroupId === group.id && (
                          <div className="flex gap-1 pt-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEditGroup(group)
                              }}
                              className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-50"
                            >
                              Editar
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteGroup(group)
                              }}
                              className="text-xs px-2 py-1 border border-red-300 text-red-600 rounded hover:bg-red-50"
                            >
                              Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-3">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Opcionais{' '}
                  {selectedGroupId &&
                    `- ${optionGroups.find((g) => g.id === selectedGroupId)?.name}`}
                </h2>
                {filteredOptions.length === 0 ? (
                  <p className="text-gray-600 text-center py-8">Nenhum opcional encontrado.</p>
                ) : (
                  <div className="space-y-2">
                    {filteredOptions.map((option) => (
                      <div
                        key={option.id}
                        className="border border-gray-200 rounded-lg p-4 hover:border-green-500 transition-colors flex items-center justify-between"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{option.name}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-sm text-gray-600">
                              {option.additionalPrice === 0
                                ? 'Sem custo adicional'
                                : new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                  }).format(option.additionalPrice)}
                            </p>
                            <span className="text-xs text-gray-500">
                              Grupo: {option.optionGroupName}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditOption(option)}
                            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteOption(option)}
                            className="px-3 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
                          >
                            Excluir
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      <OptionGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setGroupModalOpen(false)}
        onSuccess={loadData}
        editGroup={editingGroup}
        showToast={toast.showToast}
      />

      <OptionModal
        isOpen={isOptionModalOpen}
        onClose={() => setOptionModalOpen(false)}
        onSuccess={loadData}
        optionGroups={optionGroups}
        editOption={editingOption}
        showToast={toast.showToast}
      />

      <DeleteConfirmModal
        isOpen={deleteConfirm.isOpen}
        onClose={() => setDeleteConfirm({ isOpen: false, type: 'group', id: '', name: '' })}
        onConfirm={confirmDelete}
        title={`Excluir ${deleteConfirm.type === 'group' ? 'Grupo' : 'Opcional'}`}
        message={
          deleteConfirm.type === 'group'
            ? `Tem certeza que deseja excluir o grupo "${deleteConfirm.name}"? ${
                deleteConfirm.optionCount
                  ? `Este grupo tem ${deleteConfirm.optionCount} opcional(is) que serão removidos.`
                  : ''
              } Esta ação não pode ser desfeita.`
            : `Tem certeza que deseja excluir o opcional "${deleteConfirm.name}"? Esta ação não pode ser desfeita.`
        }
        isDeleting={isDeleting}
      />

      <Toast
        open={toast.open}
        onOpenChange={toast.onOpenChange}
        title={toast.title}
        description={toast.description}
      />
    </>
  )
}

