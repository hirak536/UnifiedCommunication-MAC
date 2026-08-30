import React, { useState } from 'react';
import { Search, Phone, UserPlus, Trash2, Building } from 'lucide-react';
import { Contact } from '../types/pjsip';

interface ContactsProps {
  contacts: Contact[];
  onCall: (destination: string) => void;
  onAddContact: (contact: Omit<Contact, 'id'>) => void;
  onDeleteContact: (id: string) => void;
}

export const Contacts: React.FC<ContactsProps> = ({
  contacts,
  onCall,
  onAddContact,
  onDeleteContact,
}) => {
  const [search, setSearch] = useState<string>('');
  const [isAddOpen, setIsAddOpen] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [number, setNumber] = useState<string>('');
  const [company, setCompany] = useState<string>('');
  const [email, setEmail] = useState<string>('');

  const filtered = contacts.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.number.includes(q) ||
      (c.company && c.company.toLowerCase().includes(q))
    );
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !number.trim()) return;
    onAddContact({
      name: name.trim(),
      number: number.trim(),
      company: company.trim() || undefined,
      email: email.trim() || undefined,
    });
    setName('');
    setNumber('');
    setCompany('');
    setEmail('');
    setIsAddOpen(false);
  };

  return (
    <div className="flex flex-col h-full w-full max-w-lg mx-auto select-none animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Directory</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Team members and extensions</p>
        </div>

        <button
          onClick={() => setIsAddOpen(!isAddOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Add Contact</span>
        </button>
      </div>

      {/* Add Contact Drawer / Form */}
      {isAddOpen && (
        <form
          onSubmit={handleAddSubmit}
          className="p-3 mb-3 rounded-2xl bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 space-y-2 animate-fadeIn"
        >
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              required
              placeholder="Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="glass-input px-3 py-1.5 rounded-xl text-xs outline-none"
            />
            <input
              type="text"
              required
              placeholder="Extension / Number *"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="glass-input px-3 py-1.5 rounded-xl text-xs outline-none font-mono"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Company / Dept"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="glass-input px-3 py-1.5 rounded-xl text-xs outline-none"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass-input px-3 py-1.5 rounded-xl text-xs outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1 rounded-lg bg-brand-600 text-white text-xs font-semibold hover:bg-brand-500"
            >
              Save
            </button>
          </div>
        </form>
      )}

      {/* Search Input */}
      <div className="relative mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, department, or extension..."
          className="glass-input w-full pl-8 pr-3 py-2 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none"
        />
        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {filtered.length === 0 ? (
          <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-8">
            No contacts found.
          </p>
        ) : (
          filtered.map((c) => (
            <div
              key={c.id}
              className="group flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 hover:border-brand-500/40 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-all shadow-xs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-brand-500/20 text-brand-600 dark:text-brand-400 border border-brand-500/20 flex items-center justify-center font-bold text-sm">
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {c.name}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono">
                    <span>{c.number}</span>
                    {c.company && (
                      <>
                        <span>•</span>
                        <span className="font-sans flex items-center gap-1">
                          <Building className="w-3 h-3" /> {c.company}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onDeleteContact(c.id)}
                  title="Delete Contact"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onCall(c.number)}
                  title={`Call ${c.name}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500 text-emerald-600 dark:text-emerald-400 hover:text-white transition-all text-xs font-semibold cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
