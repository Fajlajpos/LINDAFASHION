'use client';

import React, { useState } from 'react';
import { Plus, Edit, Trash2, FolderTree } from 'lucide-react';

export default function AdminKategoriePage() {
  const [categories, setCategories] = useState([
    { id: 'c1', nazev: 'Šaty', slug: 'saty', count: 14 },
    { id: 'c2', nazev: 'Halenky & Košile', slug: 'halenky-a-kosile', count: 9 },
    { id: 'c3', nazev: 'Svetry & Kardigany', slug: 'svetry-a-kardigany', count: 7 },
    { id: 'c4', nazev: 'Saka & Kabáty', slug: 'saka-a-kabaty', count: 5 },
    { id: 'c5', nazev: 'Dárkové poukazy', slug: 'darkove-poukazy', count: 1 },
  ]);

  const [newCatName, setNewCatName] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatName) {
      const slug = newCatName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      setCategories([...categories, { id: `c_${Date.now()}`, nazev: newCatName, slug, count: 0 }]);
      setNewCatName('');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="border-b border-[#E4D9C8] pb-6">
        <h1 className="font-serif text-3xl sm:text-4xl text-[#2B2019]">Správa kategorií</h1>
        <p className="text-xs text-[#2B2019]/60 mt-1">Kategorie a vnořené podkategorie pro zařazení italského oblečení</p>
      </div>

      {/* Add new category form */}
      <form onSubmit={handleAdd} className="p-6 bg-white rounded-2xl border border-[#E4D9C8]/80 shadow-card flex gap-4">
        <input
          type="text"
          required
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          placeholder="Název nové kategorie (např. Kalhoty & Sukně)..."
          className="flex-1 bg-[#FAF8F4] border border-[#E4D9C8] rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-[#7A4B32]"
        />
        <button type="submit" className="px-6 py-2.5 bg-[#7A4B32] text-white text-xs font-semibold rounded-xl hover:bg-[#633B26] flex items-center gap-1.5">
          <Plus className="w-4 h-4" />
          Přidat
        </button>
      </form>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E4D9C8]/80 shadow-card overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF8F4] border-b border-[#E4D9C8]/60 text-[#2B2019]">
            <tr>
              <th className="p-4 font-semibold">Název kategorie</th>
              <th className="p-4 font-semibold">URL Slug</th>
              <th className="p-4 font-semibold">Počet produktů</th>
              <th className="p-4 font-semibold text-right">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4D9C8]/40">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-[#FAF8F4]/50">
                <td className="p-4 font-medium text-[#2B2019] flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-[#7A4B32]" />
                  {cat.nazev}
                </td>
                <td className="p-4 text-[#2B2019]/60 font-mono text-[11px]">{cat.slug}</td>
                <td className="p-4 font-semibold text-[#7A4B32]">{cat.count} modelů</td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => setCategories(categories.filter((c) => c.id !== cat.id))} className="p-1.5 text-gray-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
