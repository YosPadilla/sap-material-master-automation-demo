export function createSyntheticMaterials() {
  return Array.from({ length: 100 }, (_, index) => ({
    row: index + 1,
    internalPartNumber: index === 36 ? '' : String(7001001 + index),
    validation: 'pending'
  }));
}

export async function loadMaterials() {
  try {
    const response = await fetch('./data/materials-demo.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Demo JSON unavailable');
    return await response.json();
  } catch (_) {
    return createSyntheticMaterials();
  }
}
