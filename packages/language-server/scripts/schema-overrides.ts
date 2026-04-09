/**
 * Schema overrides — vendor 由来の補正情報。
 * ドキュメント BNF だけでは判別できない型やフラグを上書きする。
 * Task 7 で vendor 検証テストを通して必要な override を追加する。
 */

export interface SchemaOverride {
	properties?: Record<
		string,
		Partial<{
			type: string;
			required: boolean;
			multiple: boolean;
			arity: number;
		}>
	>;
	children?: Record<
		string,
		Partial<{
			required: boolean;
			multiple: boolean;
			schemaKey: string;
		}>
	>;
}

export const schemaOverrides: Record<string, SchemaOverride> = {
	// 例: Particle の範囲型プロパティ
	// (ドキュメントでは float, float と書かれているが、実際は expression として扱うべき)
};
