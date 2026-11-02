import type { CategoryNode } from "@sayren/storefront-sdk";

/** 트리에서 카테고리와 그 부모를 찾는다(최대 4단계) */
export function findCategory(
  tree: CategoryNode[],
  categoryId: string,
  parents: CategoryNode[] = [],
): { node: CategoryNode; parents: CategoryNode[] } | null {
  for (const node of tree) {
    if (node.categoryId === categoryId) return { node, parents };
    const found = findCategory(node.children, categoryId, [...parents, node]);
    if (found) return found;
  }
  return null;
}
