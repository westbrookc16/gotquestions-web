import modal
app = modal.App("file-upload", image=modal.Image.debian_slim())
# Create a persistent volume
volume = modal.Volume.from_name("gotquestions-storage", create_if_missing=True)
@app.function(volumes={"/gotquestions-storage": volume})
def run():
    # Upload CSV file into the volume
    with open("/gotquestions-storage/gotquestions.csv", "w") as f:
        with open("gotquestions.csv", "r") as local_file:
            f.write(local_file.read())
    volume.commit()
    print("CSV file uploaded successfully!")
