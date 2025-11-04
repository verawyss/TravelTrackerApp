// This is part 2 of app/page.tsx - the render functions
// Copy this content and paste it INSIDE the TravelTrackerPro component, replacing the renderTabContent placeholder

function renderTabContent() {
  switch (activeTab) {
    case 'overview':
      return renderOverview()
    case 'expenses':
      return renderExpenses()
    case 'itinerary':
      return renderItinerary()
    case 'packing':
      return renderPacking()
    case 'settlement':
      return renderSettlement()
    case 'admin':
      return renderAdmin()
    default:
      return null
  }
}

function renderOverview() {
  const daysUntil = calculateDaysUntilTrip()
  const duration = calculateTripDuration()
  const total = calculateTotalExpenses()
  const perPerson = calculateExpensesPerPerson()
  const packingProgress = calculatePackingProgress()

  return (
    <div>
      {/* Alert */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg mb-5">
        <div className="font-semibold text-blue-800">👋 Willkommen zurück!</div>
        <div className="text-sm text-blue-700">
          Deine {currentTrip?.name} beginnt in {daysUntil} Tagen. Zeit zum Packen!
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white p-5 rounded-2xl text-center">
          <div className="text-3xl font-bold mb-1">€{total.toFixed(2)}</div>
          <div className="text-xs opacity-90">💰 Gesamtkosten</div>
        </div>
        <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white p-5 rounded-2xl text-center">
          <div className="text-3xl font-bold mb-1">€{perPerson.toFixed(2)}</div>
          <div className="text-xs opacity-90">👤 Pro Person</div>
        </div>
        <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white p-5 rounded-2xl text-center">
          <div className="text-3xl font-bold mb-1">{duration} Tage</div>
          <div className="text-xs opacity-90">📅 Reisedauer</div>
        </div>
        <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white p-5 rounded-2xl text-center">
          <div className="text-3xl font-bold mb-1">{packingProgress}%</div>
          <div className="text-xs opacity-90">🎒 Gepackt</div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Letzte Aktivitäten</h3>
          <span className="text-xl">📝</span>
        </div>
        
        {expenses.slice(0, 3).map(expense => (
          <div key={expense.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-2">
            <span className="text-2xl">{getExpenseIcon(expense.category)}</span>
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-800">{expense.description}</div>
              <div className="text-xs text-gray-500">Bezahlt von {expense.paid_by}</div>
            </div>
            <div className="font-bold text-[#667eea]">€{expense.amount.toFixed(2)}</div>
          </div>
        ))}
        
        {packingProgress > 0 && (
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <span className="text-2xl">🎒</span>
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-800">Packliste aktualisiert</div>
              <div className="text-xs text-gray-500">{packingItems.filter(i => i.packed).length} von {packingItems.length} Items</div>
            </div>
            <div className="font-bold text-[#667eea]">{packingProgress}%</div>
          </div>
        )}
      </div>

      {/* Next Activities */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Nächste Aktivitäten</h3>
          <span className="text-xl">🎯</span>
        </div>
        
        {itineraryItems.slice(0, 3).map(item => (
          <div key={item.id} className="p-4 bg-gray-50 rounded-xl mb-3">
            <div className="font-semibold mb-1">{item.title}</div>
            <div className="text-sm text-gray-600">Tag {item.day} • {item.time} Uhr</div>
          </div>
        ))}

        {itineraryItems.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">📅</div>
            <div className="text-sm">Noch keine Aktivitäten geplant</div>
          </div>
        )}
      </div>
    </div>
  )
}

function renderExpenses() {
  // Calculate category totals
  const categoryTotals: { [key: string]: number } = {}
  let total = 0
  
  expenses.forEach(expense => {
    categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount
    total += expense.amount
  })

  const categories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])

  return (
    <div>
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mb-5">
        <div className="font-semibold text-yellow-800">💡 Tipp</div>
        <div className="text-sm text-yellow-700">Füge alle Ausgaben hinzu für eine faire Abrechnung!</div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Alle Ausgaben</h3>
          <button 
            className="bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white px-4 py-2 rounded-full text-sm font-semibold"
            onClick={() => alert('In der Vollversion kannst du hier neue Ausgaben hinzufügen!')}
          >
            + Neu
          </button>
        </div>

        {expenses.map(expense => (
          <div key={expense.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl mb-2">
            <span className="text-2xl">{getExpenseIcon(expense.category)}</span>
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-800">{expense.description}</div>
              <div className="text-xs text-gray-500">Bezahlt von {expense.paid_by} • {expense.category}</div>
            </div>
            <div className="font-bold text-[#667eea]">€{expense.amount.toFixed(2)}</div>
          </div>
        ))}

        {expenses.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">💰</div>
            <div className="text-sm">Noch keine Ausgaben vorhanden</div>
          </div>
        )}
      </div>

      {categories.length > 0 && (
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">Kosten pro Kategorie</h3>
            <span className="text-xl">📊</span>
          </div>

          {categories.map(([category, amount]) => {
            const percentage = total > 0 ? (amount / total) * 100 : 0
            return (
              <div key={category} className="mb-4">
                <div className="flex justify-between mb-1">
                  <span className="text-sm">{getExpenseIcon(category)} {category}</span>
                  <span className="font-semibold">€{amount.toFixed(2)} ({percentage.toFixed(0)}%)</span>
                </div>
                <div className="bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#667eea] h-full rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function renderItinerary() {
  const dayItems = itineraryItems.filter(item => item.day === selectedDay)
  const maxDay = Math.max(...itineraryItems.map(i => i.day), 5)

  return (
    <div>
      {/* Day Selector */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-5">
        {Array.from({ length: maxDay }, (_, i) => i + 1).map(day => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`flex-shrink-0 px-5 py-2 rounded-xl font-semibold transition-all ${
              selectedDay === day
                ? 'bg-[#667eea] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tag {day}
          </button>
        ))}
      </div>

      <h3 className="text-lg font-bold text-gray-800 mb-4">
        📅 {currentTrip && new Date(new Date(currentTrip.start_date).getTime() + (selectedDay - 1) * 86400000).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
      </h3>

      {dayItems.map(item => (
        <div key={item.id} className="flex gap-4 mb-5">
          <div className="bg-[#667eea] text-white px-3 py-2 rounded-xl font-semibold text-sm h-fit min-w-[60px] text-center">
            {item.time}
          </div>
          <div className="flex-1 bg-gray-50 p-4 rounded-xl">
            <div className="font-bold text-gray-800 mb-1">{item.title}</div>
            <div className="text-sm text-gray-600 mb-2">{item.details}</div>
            <span className="inline-block bg-[#667eea] text-white text-xs px-3 py-1 rounded-full">
              {item.type}
            </span>
          </div>
        </div>
      ))}

      {dayItems.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">🗓️</div>
          <div className="text-lg font-semibold mb-2">Noch nichts geplant</div>
          <div className="text-sm">Füge Aktivitäten für Tag {selectedDay} hinzu</div>
        </div>
      )}
    </div>
  )
}

function renderPacking() {
  const progress = calculatePackingProgress()
  const grouped: { [key: string]: PackingItem[] } = {}
  
  packingItems.forEach(item => {
    if (!grouped[item.category]) grouped[item.category] = []
    grouped[item.category].push(item)
  })

  const season = currentTrip ? getSeason(currentTrip.start_date) : 'summer'
  const seasonInfo = packingTemplates[season]

  return (
    <div>
      {/* Progress */}
      <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white rounded-2xl p-5 text-center mb-5">
        <div className="text-base mb-2">Dein Pack-Fortschritt</div>
        <div className="text-4xl font-bold mb-4">{progress}%</div>
        <div className="bg-white/30 h-3 rounded-full overflow-hidden">
          <div 
            className="bg-white h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-lg mb-5">
        <div className="font-semibold text-blue-800">{seasonInfo.icon} {seasonInfo.name}-Packliste</div>
        <div className="text-sm text-blue-700">Basierend auf deinem Reisedatum ({currentTrip && new Date(currentTrip.start_date).toLocaleDateString('de-DE', { month: 'long' })})</div>
      </div>

      {progress === 100 && (
        <div className="bg-green-50 border-l-4 border-green-400 p-5 rounded-lg mb-5 text-center">
          <div className="text-5xl mb-3">🎉</div>
          <div className="text-xl font-bold text-green-800 mb-2">Perfekt gepackt!</div>
          <div className="text-sm text-green-700">Alle Items sind abgehakt. Du bist bereit! ✈️</div>
        </div>
      )}

      {Object.entries(grouped).map(([category, items]) => {
        const packedCount = items.filter(i => i.packed).length
        return (
          <div key={category} className="mb-6">
            <div className="flex items-center gap-3 pb-2 border-b-2 border-gray-200 mb-3">
              <span className="text-2xl">{category.split(' ')[0]}</span>
              <h3 className="text-lg font-bold text-gray-800 flex-1">
                {category.split(' ').slice(1).join(' ')}
              </h3>
              <span className="text-sm bg-gray-100 px-3 py-1 rounded-full">
                {packedCount}/{items.length}
              </span>
            </div>

            {items.map(item => (
              <div
                key={item.id}
                onClick={() => togglePackingItem(item.id)}
                className={`flex items-center gap-3 p-3 rounded-xl mb-2 cursor-pointer transition-all hover:translate-x-1 ${
                  item.packed ? 'bg-green-50 opacity-70' : 'bg-gray-50 hover:bg-gray-100'
                }`}
              >
                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                  item.packed ? 'bg-[#667eea] border-[#667eea]' : 'border-[#667eea]'
                }`}>
                  {item.packed && <span className="text-white text-sm">✓</span>}
                </div>
                <div className="flex-1">
                  <div className={`text-sm font-medium ${item.packed ? 'line-through text-gray-500' : 'text-gray-800'}`}>
                    {item.item}
                  </div>
                  {item.essential && (
                    <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-lg mt-1">
                      ⭐ Wichtig
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      })}

      {packingItems.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-5xl mb-3">🎒</div>
          <div className="text-lg font-semibold mb-2">Packliste wird erstellt...</div>
          <div className="text-sm">Lade die Seite neu</div>
        </div>
      )}

      <button
        onClick={() => {
          if (confirm('Möchtest du wirklich alle Items zurücksetzen?')) {
            packingItems.forEach(item => {
              if (item.packed) {
                supabase.from('packing_items').update({ packed: false }).eq('id', item.id).then(() => {
                  setPackingItems(packingItems.map(i => ({ ...i, packed: false })))
                })
              }
            })
          }
        }}
        className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all mt-3"
      >
        🔄 Alles zurücksetzen
      </button>
    </div>
  )
}

function renderSettlement() {
  // Simplified settlement calculation for demo
  // In real app, calculate based on actual expense data
  return (
    <div>
      <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg mb-5">
        <div className="font-semibold text-green-800">✅ Abrechnung berechnet!</div>
        <div className="text-sm text-green-700">Basierend auf allen Ausgaben</div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Wer schuldet wem?</h3>
          <span className="text-xl">💸</span>
        </div>

        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">💳</div>
          <div className="text-sm">Abrechnung wird berechnet...</div>
          <div className="text-xs mt-2">Basierend auf {expenses.length} Ausgaben</div>
        </div>
      </div>

      <button
        onClick={() => alert('In der Vollversion kannst du die Abrechnung als PDF exportieren!')}
        className="w-full bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
      >
        📄 Als PDF exportieren
      </button>
    </div>
  )
}

function renderAdmin() {
  return (
    <div>
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mb-5">
        <div className="font-semibold text-yellow-800">👑 Admin-Bereich</div>
        <div className="text-sm text-yellow-700">Verwalte Benutzer und Einstellungen</div>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Reise-Einstellungen</h3>
          <span className="text-xl">⚙️</span>
        </div>

        <div className="mb-4">
          <label className="block font-semibold text-gray-700 mb-2 text-sm">🏨 Reisename</label>
          <input
            type="text"
            value={currentTrip?.name}
            readOnly
            className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm"
          />
        </div>

        <div className="mb-4">
          <label className="block font-semibold text-gray-700 mb-2 text-sm">📍 Reiseziel</label>
          <input
            type="text"
            value={currentTrip?.destination}
            readOnly
            className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block font-semibold text-gray-700 mb-2 text-sm">📅 Start</label>
            <input
              type="date"
              value={currentTrip?.start_date}
              readOnly
              className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 mb-2 text-sm">📅 Ende</label>
            <input
              type="date"
              value={currentTrip?.end_date}
              readOnly
              className="w-full p-3 border-2 border-gray-200 rounded-xl text-sm"
            />
          </div>
        </div>

        <button
          onClick={() => alert('Einstellungen gespeichert! ✅')}
          className="w-full bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white py-3 rounded-xl font-semibold"
        >
          💾 Einstellungen speichern
        </button>
      </div>

      <div className="bg-white rounded-2xl p-5 shadow-sm mb-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Statistiken</h3>
          <span className="text-xl">📊</span>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between p-3 bg-gray-50 rounded-xl">
            <span className="text-gray-600">💰 Ausgaben:</span>
            <span className="font-bold">{expenses.length} Einträge</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 rounded-xl">
            <span className="text-gray-600">📅 Aktivitäten:</span>
            <span className="font-bold">{itineraryItems.length} geplant</span>
          </div>
          <div className="flex justify-between p-3 bg-gray-50 rounded-xl">
            <span className="text-gray-600">🎒 Pack-Items:</span>
            <span className="font-bold">{packingItems.length} Stück</span>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white rounded-2xl p-6 text-center">
        <div className="text-5xl mb-3">👑</div>
        <div className="text-lg font-bold mb-1">Du bist Admin</div>
        <div className="text-sm opacity-90">Volle Kontrolle über diese Reise</div>
      </div>
    </div>
  )
}
