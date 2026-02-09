document.getElementById("closePfpChanger").addEventListener("click", () => {
    document.getElementById("pfpChanger").style.display = "none";
});

document.getElementById("filepfp").addEventListener("change", () => {
    const fileSizeMessage = document.getElementById('fileSizeMessage');
    const maxFSMB = 1 // megabytes
    const maxFSByte = maxFSMB * 1000000 // megabytes in bytes
    const file = document.getElementById("filepfp").files[0];
    const fileInput = document.getElementById("filepfp");
    if (fileInput.files.length > 0) {
        if (file.size > maxFSByte) {
            fileSizeMessage.textContent = `File must be smaller than ${maxFSMB}MB!`;
            fileInput.value = '';
            fileSizeMessage.style.color = "red";
        } else {
            fileSizeMessage.textContent = `File size: ${(file.size / (1000000)).toFixed(2)}MB`;
            fileSizeMessage.style.color = 'green';
            if (!file) return;
            const reader = new FileReader();
            reader.onloadend = function () {
                pfpimg = reader.result;
                save()
                document.getElementById("userPic").src = pfpimg;
                document.getElementById("bigpfp").src = pfpimg;
            }
            if (file) {
                reader.readAsDataURL(file);
            }
        }
    } else {
        fileSizeMessage.textContent = '';
    }
});

document.getElementById("userCont").addEventListener("click", () => {
    document.getElementById("pfpChanger").style.display = "block";
});

document.getElementById("logout").addEventListener("click", () => {
    // URL to take user to Formbar for authentication
    const AUTH_URL = process.env.AUTH_URL; // ... or the address to the instance of fbjs you wish to connect to

    //URL to take user back to after authentication
    const THIS_URL = process.env.THIS_URL; // ... or whatever the address to your application is
    fetch("")
});