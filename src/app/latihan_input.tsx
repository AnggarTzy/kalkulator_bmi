import {
  Button,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

 import { useState } from "react";

export default function Index() {

  const [nama, setNama] = useState("");
  const [kelas, setKelas] = useState("");
  const [alamat, setAlamat] = useState("");
  const [umur, setUmur] = useState("");
  const [hobi, setHobi] = useState("");

  const [hasil, setHasil] = useState(false);

  const tampilkanHasil = () => {
    setHasil (true);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>

      <Text style={styles.title}>
        SELAMAT DATANG DI INPUTAN!
      </Text>

      <Text style={styles.subtitle}>
        Masukkanlah inputanmu
      </Text>

      <Text style={styles.label}>
        Nama
      </Text>

      <TextInput
        style={styles.textbox}
        placeholder="Masukkan Nama"
        value={nama}
        onChangeText={setNama}
      />

      <Text style={styles.label}>
        Kelas
      </Text>

      <TextInput
        style={styles.textbox}
        placeholder="Masukkan Kelas"
        value={kelas}
        onChangeText={setKelas}
      />

      <Text style={styles.label}>
        Alamat
      </Text>

      <TextInput
        style={styles.textbox}
        placeholder="Masukkan Alamat"
        value={alamat}
        onChangeText={setAlamat}
      />
      
      <Text style={styles.label}>
        Umur
      </Text>

      <TextInput
        style={styles.textbox}
        placeholder="Masukkan Umur"
        value={umur}
        onChangeText={setUmur}
      />

      <Text style={styles.label}>
        Hobi
      </Text>

      <TextInput
        style={styles.textbox}
        placeholder="Masukkan Hobi"
        value={hobi}
        onChangeText={setHobi}
      />

      <Text style={styles.paragraf}>
        Aplikasi ini merupakan sebuah aplikasi uji coba untuk memberikan inputan 
        kepada admin, bisa berupa nama, kelas, alamat, umur, dan hobi seseorang, 
        data yang sudah masuk dapat di edit atau di rubah
      </Text>

      <Image
        source={{uri:"https://www.google.com/imgres?q=admin&imgurl=https%3A%2F%2Fpng.pngtree.com%2Fpng-clipart%2F20230409%2Foriginal%2Fpngtree-admin-and-customer-service-job-vacancies-png-image_9041264.png&imgrefurl=https%3A%2F%2Fid.pngtree.com%2Fso%2Fpekerjaan-admin&docid=NMQMPIlyy8R7TM&tbnid=OhnFzQX2vkJFYM&vet=12ahUKEwjFo6bY89uWAxVH9zgGHdsrGMAQnPAOegUIlAEQAA..i&w=1200&h=1200&hcb=2&ved=2ahUKEwjFo6bY89uWAxVH9zgGHdsrGMAQnPAOegUIlAEQAA"}}
        style={styles.image}
      />

      <Button
        title="Enter"
        onPress={tampilkanHasil}
        color="Dark Blue"
      />

      {hasil &&(
        <View style={styles.hasilBox}>

          <Text style= {styles.hasilTitle}>
            HASIL DATA
          </Text>

          <Text style= {styles.hasil}>
            Nama: {nama}
          </Text>

          <Text style= {styles.hasil}>
            Kelas: {kelas}
          </Text>

          <Text style= {styles.hasil}>
            Alamat: {alamat}
          </Text>

          <Text style= {styles.hasil}>
            Umur: {umur}
          </Text>

          <Text style= {styles.hasil}>
            Hobi: {hobi}
          </Text>

        </View>
      )}
        
    </ScrollView>
  );
      }

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#D3D3D3",
    padding: 30,
  },

  title: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#00008B",
  },

  subtitle: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },

  label: {
    fontSize: 18,
    fontWeight: "bold",
    alignSelf: "flex-start",
    marginTop: 10,
    marginLeft: 140,  
  },

  textbox: {
    height: 50,
    width: "90%",
    borderWidth: 1,
    borderColor: "#D3D3D3",
    borderRadius: 10,  
    paddingHorizontal: 20,
    marginTop: 5,
    backgroundColor: "#D3D3D3"
  },

  paragraf: {
    fontSize: 18,
    marginTop: 20,
    marginBottom: 20,
    textAlign: "center",
    width: "100%",  
    marginLeft: 140,
    marginRight: 140,
  },

  image: {
    width: 200,
    height: 300,
    borderRadius: 5, 
  },

  hasilBox: {
    width: 200,
    marginTop: 25,
    padding: 20,
    borderRadius:10,
    backgroundColor: "#D3D3D3",
    borderWidth: 1,
    borderColor: "#D3D3D3",
  },

  hasilTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#000000",
  },

  hasil: {
    fontSize: 18,
    marginBottom: 8,
  },

});
