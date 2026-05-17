import type { Conversation } from '../hooks/useConversations'
import { IconPlus, IconTrash } from './Icons'

interface Props {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
}

export function Sidebar({ conversations, activeId, onSelect, onNew, onDelete }: Props) {
  return (
    <div className="chr-sidebar">
      <div className="chr-sidebar-head">
        <span className="chr-sidebar-title">History</span>
        <button className="chr-iconbtn" title="New conversation" onClick={onNew}>
          <IconPlus size={12} />
        </button>
      </div>
      <div className="chr-sidebar-list">
        {conversations.length === 0 && (
          <div className="chr-sidebar-empty">No conversations yet</div>
        )}
        {conversations.map((c) => (
          <button
            key={c.id}
            className="chr-sidebar-item"
            data-active={c.id === activeId}
            onClick={() => onSelect(c.id)}
          >
            <span className="chr-sidebar-item-title">{c.title}</span>
            <button
              className="chr-sidebar-del"
              title="Delete"
              onClick={(e) => { e.stopPropagation(); onDelete(c.id) }}
            >
              <IconTrash size={10} />
            </button>
          </button>
        ))}
      </div>
    </div>
  )
}
