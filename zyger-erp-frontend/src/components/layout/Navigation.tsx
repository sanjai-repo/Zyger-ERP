import { useCallback, useEffect, useRef, useState } from 'react';
import type { NavGroupNode, NavLeafNode, NavNode, NavTopItem } from '../../config/navigation';

export interface NavigationNavigatePayload {
  id: string;
  label: string;
  icon: string;
}

interface NavigationProps {
  items: NavTopItem[];
  onNavigate: (payload: NavigationNavigatePayload) => void;
}

export default function Navigation({ items, onNavigate }: NavigationProps) {
  const [openTopId, setOpenTopId] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set());
  const [flyLeftIds, setFlyLeftIds] = useState<Set<string>>(() => new Set());
  const navRef = useRef<HTMLElement | null>(null);

  const closeAll = useCallback(() => {
    setOpenTopId(null);
    setOpenGroups(new Set());
  }, []);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (!navRef.current) {
        return;
      }

      if (!navRef.current.contains(event.target as Node)) {
        closeAll();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeAll();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeAll]);

  const toggleTop = (topId: string) => {
    setOpenTopId((previous) => (previous === topId ? null : topId));
    setOpenGroups(new Set());
  };

  const toggleGroup = (groupId: string, siblingGroupIds: string[], anchor?: Element | null) => {
    if (anchor) {
      const li = anchor instanceof HTMLElement ? anchor : anchor.parentElement;
      const rect = li?.getBoundingClientRect();
      const needsLeft = rect ? rect.right + 250 > window.innerWidth : false;

      setFlyLeftIds((previous) => {
        const next = new Set(previous);
        if (needsLeft) {
          next.add(groupId);
        } else {
          next.delete(groupId);
        }
        return next;
      });
    }

    setOpenGroups((previous) => {
      const next = new Set(previous);

      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        siblingGroupIds.forEach((siblingId) => next.delete(siblingId));
        next.add(groupId);
      }

      return next;
    });
  };

  const handleLeafClick = (node: NavLeafNode) => {
    onNavigate({
      id: node.screenId ?? node.id,
      label: node.label,
      icon: node.tabIcon ?? node.icon ?? 'folder_open',
    });

    closeAll();
  };

  const handleTopLeafClick = (item: NavTopItem) => {
    onNavigate({
      id: item.screenId ?? item.id,
      label: item.label,
      icon: item.icon,
    });

    closeAll();
  };

  const renderNodes = (nodes: NavNode[]) => {
    const siblingGroupIds = nodes
      .filter((node): node is NavGroupNode => node.type === 'group')
      .map((node) => node.id);

    return nodes.map((node) => {
      if (node.type === 'heading') {
        return (
          <li key={node.id}>
            <div className="sub-head">
              {node.icon ? <span className="material-symbols-rounded">{node.icon}</span> : null}
              <span>{node.label}</span>
            </div>
          </li>
        );
      }

      if (node.type === 'item') {
        return (
          <li key={node.id}>
            <a
              href="#"
              onClick={(event) => {
                event.preventDefault();
                handleLeafClick(node);
              }}
            >
              {node.icon ? <span className="material-symbols-rounded">{node.icon}</span> : null}
              <span>{node.label}</span>
            </a>
          </li>
        );
      }

      const isOpen = openGroups.has(node.id);
      const fliesLeft = flyLeftIds.has(node.id);

      return (
        <li
          key={node.id}
          className={[isOpen ? 'subopen' : '', fliesLeft ? 'fly-left' : ''].filter(Boolean).join(' ')}
        >
          <a
            href="#"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              toggleGroup(node.id, siblingGroupIds, event.currentTarget);
            }}
          >
            {node.icon ? <span className="material-symbols-rounded">{node.icon}</span> : null}
            <span>{node.label}</span>
            <span className="material-symbols-rounded m-arr">chevron_right</span>
          </a>

          <ul className="submenu">{renderNodes(node.children)}</ul>
        </li>
      );
    });
  };

  return (
    <nav className="navigation" ref={navRef}>
      <ul className="nav-menu">
        {items.map((item) => {
          const isOpen = openTopId === item.id;

          const className = [
            'nav-item',
            isOpen ? 'open' : '',
            item.align === 'right' ? 'dropdown-right' : '',
          ]
            .filter(Boolean)
            .join(' ');

          if (!item.children || item.children.length === 0) {
            return (
              <li key={item.id} className={className}>
                <button
                  type="button"
                  className="nav-link"
                  onClick={() => handleTopLeafClick(item)}
                >
                  <span className="material-symbols-rounded">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              </li>
            );
          }

          return (
            <li key={item.id} className={className}>
              <button
                type="button"
                className="nav-link"
                aria-expanded={isOpen}
                onClick={() => toggleTop(item.id)}
              >
                <span className="material-symbols-rounded">{item.icon}</span>
                <span>{item.label}</span>
                <span className="material-symbols-rounded arrow">expand_more</span>
              </button>

              <ul className="dropdown-menu dd-list">{renderNodes(item.children)}</ul>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
