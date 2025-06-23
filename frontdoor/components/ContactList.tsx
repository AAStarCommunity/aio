'use client';

import { useState } from 'react';
import { User, Contact } from '@/lib/types';
import { contactStorage, formatAddress } from '@/lib/storage';
import { UserPlus, Trash2, Send } from 'lucide-react';
import AddContactModal from './AddContactModal';
import TransferModal from './TransferModal';

interface ContactListProps {
  contacts: Contact[];
  onDelete: (contactId: string) => void;
  onTransfer: (contact: Contact) => void;
}

export default function ContactList({ contacts, onDelete, onTransfer }: ContactListProps) {
  const handleDeleteContact = (id: string) => {
    if (confirm('确定要删除这个联系人吗？')) {
      onDelete(id);
    }
  };

  if (contacts.length === 0) {
    return (
      <div className="card text-center py-12">
        <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">暂无联系人</h3>
        <p className="text-gray-500 mb-4">添加联系人开始转账</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {contacts.map((contact) => (
        <div key={contact.id} className="card">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-gray-900">{contact.name}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {formatAddress(contact.walletAddress)}
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => onTransfer(contact)}
                className="text-primary-600 hover:text-primary-700"
                title="转账"
              >
                <Send className="h-5 w-5" />
              </button>
              <button
                onClick={() => handleDeleteContact(contact.id)}
                className="text-red-600 hover:text-red-700"
                title="删除"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 