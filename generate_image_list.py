import os

def generate_image_list():
    """
    Scans the 'assets/slideshow' directory for images and prints a
    JavaScript array of their file paths.
    """
    image_dir = 'assets/slideshow'
    allowed_extensions = ['.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp']

    # Check if the directory exists
    if not os.path.isdir(image_dir):
        print(f"Error: Directory not found at '{image_dir}'")
        print("Please create the directory and add your images before running this script.")
        return

    try:
        # Get all files in the directory
        files = os.listdir(image_dir)

        # Filter for allowed image types
        image_files = [
            f"'{image_dir}/{file}'"
            for file in sorted(files)
            if os.path.splitext(file)[1].lower() in allowed_extensions
        ]

        if not image_files:
            print(f"No images found in '{image_dir}'.")
            print("Please add images with extensions (.png, .jpg, etc.) to the folder.")
            return

        # Format the output as a JavaScript array
        js_array = ",\n".join(image_files)

        print("------------------------------------------------------------------")
        print("Copy the text below and paste it into the 'images' array in main.js")
        print("------------------------------------------------------------------\n")
        print(js_array)
        print("\n------------------------------------------------------------------")

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    generate_image_list()