import base64
from io import BytesIO

import numpy as np
import matplotlib.pyplot as plt
import matplotlib.tri as tri


def visualize_with_scalars(coords, triangles, scalars, polyline, y_scale_factor=20):
    x = coords[:, 0]
    y = coords[:, 1] * y_scale_factor

    # Create triangulation
    triang = tri.Triangulation(x, y, triangles)

    # Create the figure
    fig, ax = plt.subplots(figsize=(8, 6), dpi=600)

    # Plot the triangulation with scalar values
    tpc = ax.tripcolor(triang, scalars, shading="flat", cmap=plt.cm.jet)
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
    ax.plot(polyline_x, polyline_y, color="black", linewidth=1)
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
    plt.savefig("test3.png", bbox_inches="tight", pad_inches=0)
    buf.seek(0)
    im_base64 = base64.b64encode(buf.read()).decode("utf-8")
    plt.close(fig)
    # Show the plot
    return im_base64
