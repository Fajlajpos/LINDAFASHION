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
      <div className="border-b border-linda-sand pb-6">
        <h1 className="font-serif text-3xl sm:text-4xl text-linda-espresso">Správa kategorií</h1>
        <p className="text-xs text-linda-espresso/60 mt-1">Kategorie a vnořené podkategorie pro zařazení italského oblečení</p>
      </div>

      {/* Add new category form */}
      <form onSubmit={handleAdd} className="p-6 bg-linda-cream rounded-2xl shadow-neu flex gap-4">
        <input
          type="text"
          required
          value={newCatName}
          onChange={(e) => setNewCatName(e.target.value)}
          placeholder="Název nové kategorie (např. Kalhoty & Sukně)..."
          className="flex-1 bg-linda-sandLight shadow-neuInsetSm min-h-touch rounded-xl px-4 py-2.5 text-xs"
        />
        <button type="submit" className="px-6 min-h-touch bg-linda-cognac text-white text-xs font-semibold rounded-xl hover:bg-linda-cognacHover flex items-center gap-1.5 shadow-neuDark transition-all duration-200 active:shadow-neuSm cursor-pointer">
          <Plus className="w-4 h-4" />
          Přidat
        </button>
      </form>

      {/* Table */}
      <div className="bg-linda-cream rounded-2xl shadow-neu overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-linda-cream border-b border-linda-sand/60 text-linda-espresso">
            <tr>
              <th className="p-4 font-semibold">Název kategorie</th>
              <th className="p-4 font-semibold">URL Slug</th>
              <th className="p-4 font-semibold">Počet produktů</th>
              <th className="p-4 font-semibold text-right">Akce</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linda-sand/40">
            {categories.map((cat) => (
              <tr key={cat.id} className="hover:bg-linda-cream/50">
                <td className="p-4 font-medium text-linda-espresso flex items-center gap-2">
                  <FolderTree className="w-4 h-4 text-linda-cognac" />
                  {cat.nazev}
                </td>
                <td className="p-4 text-linda-espresso/60 font-mono text-[11px]">{cat.slug}</td>
                <td className="p-4 font-semibold text-linda-cognac">{cat.count} modelů</td>
                <td className="p-4 text-right space-x-2">
                  <button onClick={() => setCategories(categories.filter((c) => c.id !== cat.id))} className="flex min-h-touch min-w-touch cursor-pointer items-center justify-center rounded-full bg-linda-cream text-linda-espresso/75 shadow-neuSm transition-all duration-200 hover:text-red-700 active:shadow-neuInsetSm">
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
