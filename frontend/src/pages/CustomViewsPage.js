import React from 'react';
import WardrobeCategoryBreakdownChart from '../components/WardrobeCategoryBreakdownChart';
import WearFrequencyHeatmap from '../components/WearFrequencyHeatmap';
import WardrobeInventoryPDF from '../components/WardrobeInventoryPDF';
import OutfitAssemblyRulesEditor from '../components/OutfitAssemblyRulesEditor';

function CustomViewsPage() {
  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Wardrobe Views</h1>
        <p style={{ color: '#666', marginTop: 4 }}>
          Custom analytics and editors for your closet — category mix, wear cadence, exportable inventory, and outfit-assembly rules.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <WardrobeCategoryBreakdownChart />
        <WardrobeInventoryPDF />
      </div>
      <WearFrequencyHeatmap />
      <OutfitAssemblyRulesEditor />
    </div>
  );
}

export default CustomViewsPage;
