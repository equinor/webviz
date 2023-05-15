# pylint: skip-file
import base64
from io import BytesIO

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.tri as tri
import matplotlib.cm as cm
from mpl_toolkits.axes_grid1 import make_axes_locatable
from vtkmodules.vtkCommonDataModel import vtkPolyData


def visualize_with_scalars(
    coords: np.ndarray,
    triangles: list,
    scalars: np.ma.core.MaskedArray,
    polyline: vtkPolyData,
    well_name: str = "Well",
    y_scale_factor: int = 20,
) -> str:
    x = coords[:, 0]
    y = coords[:, 1] * y_scale_factor

    # Create triangulation
    triang = tri.Triangulation(x, y, triangles)

    # Create the figure
    fig, ax = plt.subplots(figsize=(8, 6), dpi=600)

    # Plot the triangulation with scalar values
    tpc = ax.tripcolor(triang, scalars, shading="flat", cmap=plt.cm.viridis)
    # Get the polyline coordinates
    polyline_coords = np.array(
        [polyline.GetPoint(i)[:3] for i in range(polyline.GetNumberOfPoints())]
    )

    # Calculate the cumulative distance along the polyline
    polyline_distances = np.zeros(polyline_coords.shape[0])
    for i in range(1, polyline_coords.shape[0]):
        polyline_distances[i] = polyline_distances[i - 1] + np.linalg.norm(
            polyline_coords[i, :2] - polyline_coords[i - 1, :2]
        )

    polyline_x = polyline_distances
    polyline_y = polyline_coords[:, 2] * y_scale_factor

    # Plot the polyline as a black line
    ax.plot(polyline_x, polyline_y, color="black", linewidth=3)
    # # Add text near the polyline
    # mid_index = len(polyline_x) // 2
    # ax.text(polyline_x[mid_index], polyline_y[mid_index], well_name, color="black")

    # Set aspect ratio
    ax.set_aspect("equal")

    # Remove axis
    ax.axis("off")

    # Set axis limits
    ax.set_xlim(x.min(), x.max())
    ax.set_ylim(y.min(), y.max())

    # Adjust the margins
    plt.tight_layout()

    # Save the plot to a file
    buf = BytesIO()
    plt.savefig(buf, bbox_inches="tight", pad_inches=0)
    buf.seek(0)
    im_base64 = base64.b64encode(buf.read()).decode("utf-8")
    plt.close(fig)
    # Show the plot
    return im_base64


# def plot_cells_with_scalar(triangulation: tri.Triangulation, scalar, polyline):
#     fig, ax = plt.subplots(figsize=(8, 6), dpi=600)
#     divider = make_axes_locatable(ax)

#     cmap = cm.get_cmap("viridis")
#     tpc = ax.tripcolor(triangulation, facecolors=scalar, cmap=cmap)

#     # Adjust the margins
#     plt.tight_layout()

#     # Remove axis
#     ax.axis("off")

#     # Plot the polyline directly using x-axis as length and z-values from the polyline
#     x_poly = [0]
#     z_poly = [polyline[0][2]]

#     for i in range(1, len(polyline)):
#         x0, y0, z0 = polyline[i - 1]
#         x1, y1, z1 = polyline[i]
#         segment_length = np.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2)
#         x_poly.append(x_poly[-1] + segment_length)
#         z_poly.append(-z1)

#     ax.plot(x_poly, z_poly, c="k", linewidth=2)

#     # Set the y-axis (z-axis in our case) limits
#     min_z = np.min(triangulation.y) - 100
#     max_z = np.max(triangulation.y) + 100
#     ax.set_ylim(min_z, max_z)

#     buf = BytesIO()
#     plt.savefig(buf, bbox_inches="tight", pad_inches=0)
#     buf.seek(0)
#     im_base64 = base64.b64encode(buf.read()).decode("utf-8")
#     plt.close(fig)

#     return im_base64
