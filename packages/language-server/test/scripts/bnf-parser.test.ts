import { describe, it, expect } from "vitest";
import { parseBnfBody } from "../../scripts/lib/bnf-parser.js";

describe("parseBnfBody", () => {
	it("parses a simple property definition (Gauge = float;)", () => {
		const html = 'Gauge = <a class="nonterm">float</a>;';
		const result = parseBnfBody(html);
		expect(result).toEqual([
			{
				kind: "property",
				name: "Gauge",
				type: "float",
				optional: false,
				multiple: false,
				arity: 1,
			},
		]);
	});

	it("parses an optional property (Height = float; opt)", () => {
		const html =
			'<span class="ctrl">(</span> Height = <a class="nonterm">float</a>; <span class="ctrl">)</span><span class="sub">opt</span>';
		const result = parseBnfBody(html);
		expect(result).toEqual([
			{
				kind: "property",
				name: "Height",
				type: "float",
				optional: true,
				multiple: false,
				arity: 1,
			},
		]);
	});

	it("parses opt cond as optional", () => {
		const html =
			'<span class="ctrl">(</span> GroupCommon = <a class="nonterm">string</a>; <span class="ctrl">)</span><span class="sub">opt cond</span>';
		const result = parseBnfBody(html);
		expect(result).toEqual([
			{
				kind: "property",
				name: "GroupCommon",
				type: "string",
				optional: true,
				multiple: false,
				arity: 1,
			},
		]);
	});

	it("parses cond as optional", () => {
		const html =
			'<span class="ctrl">(</span> TexFileName = <a class="nonterm">filename</a>; <span class="ctrl">)</span><span class="sub">cond</span>';
		const result = parseBnfBody(html);
		expect(result).toEqual([
			{
				kind: "property",
				name: "TexFileName",
				type: "filename",
				optional: true,
				multiple: false,
				arity: 1,
			},
		]);
	});

	it("parses a symbol reference with * quantifier", () => {
		const html =
			'<a class="nonterm">platform</a><span class="sup">*</span>';
		const result = parseBnfBody(html);
		expect(result).toEqual([
			{ kind: "ref", symbol: "platform", min: 0, max: Infinity },
		]);
	});

	it("parses a symbol reference with 1+ quantifier", () => {
		const html =
			'<a class="nonterm">axle-object</a><span class="sup">1+</span>';
		const result = parseBnfBody(html);
		expect(result).toEqual([
			{ kind: "ref", symbol: "axle-object", min: 1, max: Infinity },
		]);
	});

	it("parses a bare symbol reference (no quantifier)", () => {
		const html = '<a class="nonterm">plugin-header</a>';
		const result = parseBnfBody(html);
		expect(result).toEqual([
			{ kind: "ref", symbol: "plugin-header", min: 1, max: 1 },
		]);
	});

	it("parses an inline block (PistonZY{...})", () => {
		const html = `PistonZY{
    <a class="nonterm">triangle-link-zy</a>
    <a class="nonterm">triangle-link-zy</a>
}`;
		const result = parseBnfBody(html);
		expect(result).toEqual([
			{
				kind: "inline-block",
				objectName: "PistonZY",
				body: [
					{ kind: "ref", symbol: "triangle-link-zy", min: 1, max: 1 },
					{ kind: "ref", symbol: "triangle-link-zy", min: 1, max: 1 },
				],
				optional: false,
			},
		]);
	});

	it("parses a named inline block (Object3D string{...})", () => {
		const html = `Object3D <a class="nonterm">string</a>{
    <a class="nonterm">named-object-info</a>
    <a class="nonterm">object-joint-3d</a>
}`;
		const result = parseBnfBody(html);
		expect(result).toEqual([
			{
				kind: "inline-block",
				objectName: "Object3D",
				nameParam: "string",
				body: [
					{
						kind: "ref",
						symbol: "named-object-info",
						min: 1,
						max: 1,
					},
					{
						kind: "ref",
						symbol: "object-joint-3d",
						min: 1,
						max: 1,
					},
				],
				optional: false,
			},
		]);
	});

	it("parses an optional inline block ((FrontCabin{...})opt)", () => {
		const html =
			'<span class="ctrl">(</span> FrontCabin{ <a class="nonterm">object-joint-3d</a> } <span class="ctrl">)</span><span class="sub">opt</span>';
		const result = parseBnfBody(html);
		expect(result).toEqual([
			{
				kind: "inline-block",
				objectName: "FrontCabin",
				body: [
					{
						kind: "ref",
						symbol: "object-joint-3d",
						min: 1,
						max: 1,
					},
				],
				optional: true,
			},
		]);
	});

	it("parses a union of symbol references", () => {
		const html = `<a class="nonterm">model-changer</a>
<span class="ctrl">|</span> <a class="nonterm">static-rotator</a>
<span class="ctrl">|</span> <a class="nonterm">windmill</a>`;
		const result = parseBnfBody(html);
		expect(result).toEqual([
			{
				kind: "union",
				alternatives: [
					[{ kind: "ref", symbol: "model-changer", min: 1, max: 1 }],
					[
						{
							kind: "ref",
							symbol: "static-rotator",
							min: 1,
							max: 1,
						},
					],
					[{ kind: "ref", symbol: "windmill", min: 1, max: 1 }],
				],
			},
		]);
	});

	it("parses inline union (object-3d | object-zy)", () => {
		const html =
			'<a class="nonterm">object-3d</a> <span class="ctrl">|</span> <a class="nonterm">object-zy</a>';
		const result = parseBnfBody(html);
		expect(result).toEqual([
			{
				kind: "union",
				alternatives: [
					[{ kind: "ref", symbol: "object-3d", min: 1, max: 1 }],
					[{ kind: "ref", symbol: "object-zy", min: 1, max: 1 }],
				],
			},
		]);
	});

	it("parses a union-block ((Circle | Hexagon){...})", () => {
		const html = `<span class="ctrl">(</span> Circle <span class="ctrl">|</span> Hexagon <span class="ctrl">)</span>{
    Distance = <a class="nonterm">float</a>;
    Radius = <a class="nonterm">float</a>;
    InnerColor = <a class="nonterm">color</a>;
    OuterColor = <a class="nonterm">color</a>;
}`;
		const result = parseBnfBody(html);
		expect(result).toEqual([
			{
				kind: "union-block",
				objectNames: ["Circle", "Hexagon"],
				body: [
					{
						kind: "property",
						name: "Distance",
						type: "float",
						optional: false,
						multiple: false,
						arity: 1,
					},
					{
						kind: "property",
						name: "Radius",
						type: "float",
						optional: false,
						multiple: false,
						arity: 1,
					},
					{
						kind: "property",
						name: "InnerColor",
						type: "color",
						optional: false,
						multiple: false,
						arity: 1,
					},
					{
						kind: "property",
						name: "OuterColor",
						type: "color",
						optional: false,
						multiple: false,
						arity: 1,
					},
				],
			},
		]);
	});

	it("parses a union-property ((NoCastShadow|...) = integer (,integer)*;)", () => {
		const html =
			'<span class="ctrl">(</span> NoCastShadow <span class="ctrl">|</span> NoReceiveShadow <span class="ctrl">|</span> NoShadow <span class="ctrl">|</span> Transparent <span class="ctrl">)</span>\n    = <a class="nonterm">integer</a> <span class="ctrl">(</span>, <a class="nonterm">integer</a> <span class="ctrl">)</span><span class="sup">*</span> ;';
		const result = parseBnfBody(html);
		expect(result).toEqual([
			{
				kind: "union-property",
				names: [
					"NoCastShadow",
					"NoReceiveShadow",
					"NoShadow",
					"Transparent",
				],
				type: "integer",
				optional: false,
				multiple: true,
				arity: 1,
			},
		]);
	});

	it("parses an arity-2 property (Lifetime = float, float;)", () => {
		const html =
			'Lifetime = <a class="nonterm">float</a>, <a class="nonterm">float</a>;';
		const result = parseBnfBody(html);
		expect(result).toEqual([
			{
				kind: "property",
				name: "Lifetime",
				type: "float",
				optional: false,
				multiple: false,
				arity: 2,
			},
		]);
	});

	it("parses an enum property (BlendMode = (Alpha | Add);)", () => {
		const html =
			'BlendMode = <span class="ctrl">(</span> Alpha <span class="ctrl">|</span> Add <span class="ctrl">)</span>;';
		const result = parseBnfBody(html);
		expect(result).toEqual([
			{
				kind: "property",
				name: "BlendMode",
				type: "enum:Alpha,Add",
				optional: false,
				multiple: false,
				arity: 1,
			},
		]);
	});

	it("parses union of property definitions", () => {
		const html = `<span class="ctrl">(</span> ShiftTexture = <a class="nonterm">integer</a>, <a class="nonterm">float</a>, <a class="nonterm">float</a>; <span class="ctrl">)</span>
<span class="ctrl">|</span> <span class="ctrl">(</span> ScaleTexture = <a class="nonterm">integer</a>, <a class="nonterm">float</a>, <a class="nonterm">float</a>, <a class="nonterm">float</a>, <a class="nonterm">float</a>; <span class="ctrl">)</span>`;
		const result = parseBnfBody(html);
		expect(result).toEqual([
			{
				kind: "union",
				alternatives: [
					[
						{
							kind: "property",
							name: "ShiftTexture",
							type: "expression",
							optional: false,
							multiple: false,
							arity: 3,
						},
					],
					[
						{
							kind: "property",
							name: "ScaleTexture",
							type: "expression",
							optional: false,
							multiple: false,
							arity: 5,
						},
					],
				],
			},
		]);
	});

	it("parses a complex file-level grammar", () => {
		const html = `<a class="nonterm">plugin-header</a>
RailInfo{
    Gauge = <a class="nonterm">float</a>;
    Height = <a class="nonterm">float</a>;
}
<a class="nonterm">profile-list</a>`;
		const result = parseBnfBody(html);
		expect(result).toHaveLength(3);
		expect(result[0]).toEqual({
			kind: "ref",
			symbol: "plugin-header",
			min: 1,
			max: 1,
		});
		expect(result[1]).toMatchObject({
			kind: "inline-block",
			objectName: "RailInfo",
		});
		expect((result[1] as any).body).toHaveLength(2);
		expect(result[2]).toEqual({
			kind: "ref",
			symbol: "profile-list",
			min: 1,
			max: 1,
		});
	});

	it("parses enum property (Direction = (Up | Down);) inside optional", () => {
		const html =
			'<span class="ctrl">(</span> Direction = <span class="ctrl">(</span> Up <span class="ctrl">|</span> Down <span class="ctrl">)</span>; <span class="ctrl">)</span><span class="sub">opt</span>';
		const result = parseBnfBody(html);
		expect(result).toEqual([
			{
				kind: "property",
				name: "Direction",
				type: "enum:Up,Down",
				optional: true,
				multiple: false,
				arity: 1,
			},
		]);
	});

	it("parses AnalogClock = (Hour | Minute | Second);", () => {
		const html =
			'AnalogClock = <span class="ctrl">(</span> Hour <span class="ctrl">|</span> Minute <span class="ctrl">|</span> Second <span class="ctrl">)</span>;';
		const result = parseBnfBody(html);
		expect(result).toEqual([
			{
				kind: "property",
				name: "AnalogClock",
				type: "enum:Hour,Minute,Second",
				optional: false,
				multiple: false,
				arity: 1,
			},
		]);
	});

	it("parses optional with sup 1+ ((Entry = string;)1+)", () => {
		const html =
			'<span class="ctrl">(</span> Entry = <a class="nonterm">string</a>; <span class="ctrl">)</span><span class="sup">1+</span>';
		const result = parseBnfBody(html);
		expect(result).toEqual([
			{
				kind: "property",
				name: "Entry",
				type: "string",
				optional: false,
				multiple: true,
				arity: 1,
			},
		]);
	});

	it("parses optional arity-2 property ((ImageSize = integer, integer;)cond)", () => {
		const html =
			'<span class="ctrl">(</span> ImageSize = <a class="nonterm">integer</a>, <a class="nonterm">integer</a>; <span class="ctrl">)</span><span class="sub">cond</span>';
		const result = parseBnfBody(html);
		expect(result).toEqual([
			{
				kind: "property",
				name: "ImageSize",
				type: "integer",
				optional: true,
				multiple: false,
				arity: 2,
			},
		]);
	});

	it("parses grouped ref union with quantifier ((profile | wireframe | interval)*)", () => {
		const html =
			'<span class="ctrl">(</span> <a class="nonterm">profile</a> <span class="ctrl">|</span> <a class="nonterm">wireframe</a> <span class="ctrl">|</span> <a class="nonterm">interval</a> <span class="ctrl">)</span><span class="sup">*</span>';
		const result = parseBnfBody(html);
		expect(result).toEqual([
			{
				kind: "union",
				alternatives: [
					[{ kind: "ref", symbol: "profile", min: 0, max: Infinity }],
					[
						{
							kind: "ref",
							symbol: "wireframe",
							min: 0,
							max: Infinity,
						},
					],
					[
						{
							kind: "ref",
							symbol: "interval",
							min: 0,
							max: Infinity,
						},
					],
				],
			},
		]);
	});

	it("parses ChangeAlpha mixed pattern", () => {
		const html =
			'ChangeAlpha = <a class="nonterm">integer</a>, <span class="ctrl">(</span> <a class="nonterm">float</a> <span class="ctrl">|</span> DayAlpha <span class="ctrl">|</span> NightAlpha <span class="ctrl">)</span>;';
		const result = parseBnfBody(html);
		expect(result).toEqual([
			{
				kind: "property",
				name: "ChangeAlpha",
				type: "expression",
				optional: false,
				multiple: false,
				arity: 2,
			},
		]);
	});
});
