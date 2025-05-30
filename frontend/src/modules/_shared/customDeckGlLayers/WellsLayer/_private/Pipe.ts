import { cloneDeep } from "lodash";

import * as vec3 from "@lib/utils/vec3";


import * as mat4 from "./Mat4";
import * as plane from "./Plane";

export class Pipe {
    private _path: vec3.Vec3[] = [];
    private _contour: vec3.Vec3[] = [];
    private _contours: vec3.Vec3[][] = [];
    private _normals: vec3.Vec3[][] = [];

    constructor(pathPoints: vec3.Vec3[], contourPoints: vec3.Vec3[]) {
        this._path = pathPoints;
        this._contour = cloneDeep(contourPoints);

        this.generateContours();
    }

    getPath(): vec3.Vec3[] {
        return this._path;
    }

    getContours(): vec3.Vec3[][] {
        return this._contours;
    }

    getNormals(): vec3.Vec3[][] {
        return this._normals;
    }

    getContourCount(): number {
        return this._contours.length;
    }

    private generateContours() {
        this._contours = [];
        this._normals = [];

        if (this._path.length < 1) {
            return;
        }

        this.transformFirstContour();

        this._contours.push(this._contour);
        this._normals.push(this.computeContourNormal(0));

        for (let i = 1; i < this._path.length; ++i) {
            this._contours.push(this.projectContour(i - 1, i));
            this._normals.push(this.computeContourNormal(i));
        }
    }

    private projectContour(fromIndex: number, toIndex: number): vec3.Vec3[] {
        const dir1 = vec3.subtract(this._path[toIndex], this._path[fromIndex]);

        let dir2 = dir1;
        if (toIndex < this._path.length - 1) {
            dir2 = vec3.subtract(this._path[toIndex + 1], this._path[toIndex]);
        }

        const normal = vec3.add(dir1, dir2);
        const pl = plane.fromNormalAndPoint(normal, this._path[toIndex]);

        const fromContour = this._contours[fromIndex];
        const toContour: vec3.Vec3[] = [];

        for (let i = 0; i < fromContour.length; ++i) {
            toContour.push(plane.intersectLine(pl, { point: fromContour[i], direction: dir1 })!);
        }

        return toContour;
    }

    private transformFirstContour() {
        const matrix: mat4.Mat4 = mat4.identity();

        if (this._path.length > 0) {
            if (this._path.length > 1) {
                mat4.lookAt(matrix, vec3.subtract(this._path[1], this._path[0]));
            }

            mat4.translate(matrix, this._path[0]);

            for (let i = 0; i < this._contour.length; ++i) {
                this._contour[i] = mat4.multiply(matrix, this._contour[i]);
            }
        }
    }

    private computeContourNormal(pathIndex: number): vec3.Vec3[] {
        const contour = this._contours[pathIndex];
        const center = this._path[pathIndex];

        const contourNormal: vec3.Vec3[] = [];
        for (let i = 0; i < contour.length; ++i) {
            const normal = vec3.normalize(vec3.subtract(contour[i], center));
            contourNormal.push(normal);
        }

        return contourNormal;
    }
}
